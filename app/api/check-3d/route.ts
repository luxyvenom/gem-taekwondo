import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');
        const name = searchParams.get('name') || 'fighter';
        const timestamp = searchParams.get('timestamp') || Date.now().toString();
        const originalUrl = searchParams.get('originalUrl');
        const warriorUrl = searchParams.get('warriorUrl');

        if (!taskId) {
            return NextResponse.json({ error: 'No task ID provided' }, { status: 400 });
        }

        // MESHY API에서 태스크 상태 확인
        const meshyResponse = await fetch(
            `https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
                },
            }
        );

        if (!meshyResponse.ok) {
            const errorText = await meshyResponse.text();
            console.error('Meshy status check error:', errorText);
            return NextResponse.json({
                error: 'Failed to check task status',
                details: errorText,
            }, { status: 500 });
        }

        const taskData = await meshyResponse.json();

        // 아직 진행 중
        if (taskData.status === 'PENDING' || taskData.status === 'IN_PROGRESS') {
            return NextResponse.json({
                status: taskData.status,
                progress: taskData.progress || 0,
            });
        }

        // 실패
        if (taskData.status === 'FAILED' || taskData.status === 'EXPIRED') {
            return NextResponse.json({
                status: 'FAILED',
                error: taskData.task_error?.message || 'Task failed',
            });
        }

        // 성공 - GLB 파일 다운로드 후 Supabase에 저장
        if (taskData.status === 'SUCCEEDED') {
            const glbUrl = taskData.model_urls?.glb;
            const thumbnailUrl = taskData.thumbnail_url;

            if (!glbUrl) {
                return NextResponse.json({
                    status: 'FAILED',
                    error: 'No GLB URL in response',
                });
            }

            // GLB 파일 다운로드
            const glbResponse = await fetch(glbUrl);
            if (!glbResponse.ok) {
                return NextResponse.json({
                    status: 'FAILED',
                    error: 'Failed to download GLB file',
                });
            }

            const glbBuffer = Buffer.from(await glbResponse.arrayBuffer());
            const glbPath = `${user.id}/models/${timestamp}_${name}.glb`;

            // Supabase Storage에 GLB 업로드
            const { error: glbUploadError } = await supabase.storage
                .from('fighters')
                .upload(glbPath, glbBuffer, {
                    contentType: 'model/gltf-binary',
                    upsert: false,
                });

            let glbStorageUrlStr = glbUrl; // fallback
            if (!glbUploadError) {
                const { data: glbStorageUrl } = supabase.storage
                    .from('fighters')
                    .getPublicUrl(glbPath);
                glbStorageUrlStr = glbStorageUrl.publicUrl;
            }

            // 썸네일 저장
            let thumbnailStorageUrl = '';
            if (thumbnailUrl) {
                try {
                    const thumbResponse = await fetch(thumbnailUrl);
                    if (thumbResponse.ok) {
                        const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer());
                        const thumbPath = `${user.id}/thumbnails/${timestamp}_${name}.png`;

                        await supabase.storage
                            .from('fighters')
                            .upload(thumbPath, thumbBuffer, {
                                contentType: 'image/png',
                                upsert: false,
                            });

                        const { data: thumbUrl } = supabase.storage
                            .from('fighters')
                            .getPublicUrl(thumbPath);

                        thumbnailStorageUrl = thumbUrl.publicUrl;
                    }
                } catch (thumbError) {
                    console.error('Thumbnail save error:', thumbError);
                }
            }

            // user_fighters 테이블에 저장
            if (originalUrl) {
                const { error: dbError } = await supabase
                    .from('user_fighters')
                    .insert({
                        user_id: user.id,
                        name: name,
                        original_image_url: originalUrl,
                        warrior_image_url: warriorUrl,
                        glb_url: glbStorageUrlStr,
                        thumbnail_url: thumbnailStorageUrl || null
                    });

                if (dbError) {
                    console.error('Database insert error:', dbError);
                }
            }

            return NextResponse.json({
                status: 'SUCCEEDED',
                progress: 100,
                glbUrl: glbStorageUrlStr,
                glbPath,
                thumbnailUrl: thumbnailStorageUrl,
                meshyTaskId: taskId,
            });
        }


        return NextResponse.json({
            status: taskData.status,
            progress: taskData.progress || 0,
        });

    } catch (error) {
        console.error('Check 3D error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
