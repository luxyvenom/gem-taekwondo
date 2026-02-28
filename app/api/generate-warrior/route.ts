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

        // 1. 원본 이미지를 Supabase Storage에 업로드
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');

        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'png';
        const originalPath = `${user.id}/originals/${timestamp}_${name}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('fighters')
            .upload(originalPath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Original upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload original image' }, { status: 500 });
        }

        const { data: originalUrl } = supabase.storage
            .from('fighters')
            .getPublicUrl(originalPath);

        // 2. Gemini (나노바나나)로 전사 이미지 생성
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

        const prompt = [
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
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-preview-image-generation',
            contents: prompt,
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
            },
        });

        // 3. 생성된 전사 이미지를 찾아서 Supabase에 저장
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

        if (!warriorImageBase64) {
            return NextResponse.json({
                error: 'Failed to generate warrior image',
                details: generatedText || 'No image in response',
            }, { status: 500 });
        }

        // 4. 전사 이미지를 Supabase Storage에 업로드
        const warriorBuffer = Buffer.from(warriorImageBase64, 'base64');
        const warriorPath = `${user.id}/warriors/${timestamp}_${name}.png`;

        const { error: warriorUploadError } = await supabase.storage
            .from('fighters')
            .upload(warriorPath, warriorBuffer, {
                contentType: 'image/png',
                upsert: false,
            });

        if (warriorUploadError) {
            console.error('Warrior upload error:', warriorUploadError);
            return NextResponse.json({ error: 'Failed to upload warrior image' }, { status: 500 });
        }

        const { data: warriorUrl } = supabase.storage
            .from('fighters')
            .getPublicUrl(warriorPath);

        return NextResponse.json({
            success: true,
            originalUrl: originalUrl.publicUrl,
            warriorUrl: warriorUrl.publicUrl,
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
