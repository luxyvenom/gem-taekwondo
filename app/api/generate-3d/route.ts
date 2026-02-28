import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageUrl, name, timestamp } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
        }

        // MESHY API에 Image-to-3D 태스크 생성
        const meshyResponse = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_url: imageUrl,
                enable_pbr: true,
                should_remesh: true,
                should_texture: true,
                ai_model: 'meshy-6',
                topology: 'triangle',
                target_polycount: 30000,
            }),
        });

        if (!meshyResponse.ok) {
            const errorText = await meshyResponse.text();
            console.error('Meshy API error:', errorText);
            return NextResponse.json({
                error: 'Failed to create 3D task',
                details: errorText,
            }, { status: 500 });
        }

        const meshyData = await meshyResponse.json();
        const taskId = meshyData.result;

        return NextResponse.json({
            success: true,
            taskId,
            userId: user.id,
            name,
            timestamp,
        });

    } catch (error) {
        console.error('Generate 3D error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
