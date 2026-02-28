import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerSupabase } from '@/lib/supabase-server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('image') as File;
        const name = (formData.get('name') as string) || 'fighter';

        if (!file) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // 1. 이미지를 base64로 변환
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');

        // 2. Gemini로 전사 이미지 생성 (먼저 실행 — Supabase 업로드 실패와 무관하게)
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp-image-generation',
            contents: {
                role: 'user',
                parts: [
                    {
                        text: `Transform this animal into an epic anthropomorphic beast warrior character for a fighting game called TAEKWON-CLASH. 
The warrior should:
- Be standing in a dynamic martial arts fighting pose (taekwondo stance)
- Have the animal's features (face, fur/scales/feathers) but humanoid muscular body
- Wear minimal martial arts gear (hand wraps, belt, shin guards)
- Have an intense battle-ready expression
- Be rendered in a stylized 3D game character style with dramatic lighting
- Full body visible, front-facing, centered on a clean dark background
- High quality, detailed, game-ready character design
Keep the animal's signature colors and distinctive features prominent.`,
                    },
                    {
                        inlineData: {
                            mimeType: file.type as string,
                            data: base64Image,
                        },
                    },
                ],
            },
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
            },
        });

        // 3. 생성된 전사 이미지를 응답에서 추출
        let warriorImageBase64: string | null = null;
        let generatedText: string | null = null;

        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    generatedText = part.text;
                } else if (part.inlineData) {
                    warriorImageBase64 = part.inlineData.data || null;
                }
            }
        }

        // finishReason 체크
        const finishReason = response.candidates?.[0]?.finishReason;
        if (!warriorImageBase64) {
            return NextResponse.json({
                error: 'Failed to generate warrior image',
                finishReason: finishReason || 'UNKNOWN',
                details: generatedText || 'No image in Gemini response. The model may have blocked the content.',
            }, { status: 500 });
        }

        // 4. Supabase Storage에 업로드 (실패해도 결과는 돌려줌)
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'png';
        const originalPath = `${user.id}/originals/${timestamp}_${name}.${ext}`;
        const warriorPath = `${user.id}/warriors/${timestamp}_${name}.png`;
        let originalPublicUrl: string | null = null;
        let warriorPublicUrl: string | null = null;

        try {
            // 원본 이미지 업로드
            const { error: uploadError } = await supabase.storage
                .from('fighters')
                .upload(originalPath, buffer, {
                    contentType: file.type,
                    upsert: true,
                });

            if (!uploadError) {
                const { data: originalUrl } = supabase.storage
                    .from('fighters')
                    .getPublicUrl(originalPath);
                originalPublicUrl = originalUrl.publicUrl;
            } else {
                console.error('Original upload error:', uploadError);
            }

            // 전사 이미지 업로드
            const warriorBuffer = Buffer.from(warriorImageBase64, 'base64');
            const { error: warriorUploadError } = await supabase.storage
                .from('fighters')
                .upload(warriorPath, warriorBuffer, {
                    contentType: 'image/png',
                    upsert: true,
                });

            if (!warriorUploadError) {
                const { data: warriorUrl } = supabase.storage
                    .from('fighters')
                    .getPublicUrl(warriorPath);
                warriorPublicUrl = warriorUrl.publicUrl;
            } else {
                console.error('Warrior upload error:', warriorUploadError);
            }
        } catch (storageError) {
            console.error('Storage error (non-blocking):', storageError);
        }

        // 5. 결과 반환 — 스토리지 성공 여부와 무관하게 base64 이미지는 항상 포함
        return NextResponse.json({
            success: true,
            originalUrl: originalPublicUrl,
            warriorUrl: warriorPublicUrl,
            warriorBase64: `data:image/png;base64,${warriorImageBase64}`,
            originalPath,
            warriorPath,
            name,
            timestamp,
        });

    } catch (error) {
        console.error('Generate warrior error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
