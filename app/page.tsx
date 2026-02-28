import { HeroSection } from '@/components/hero-odyssey';
import { redirect } from 'next/navigation';

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  if (params?.code) {
    redirect(`/auth/callback?code=${params.code}`);
  }

  return (
    <main>
      <HeroSection />
    </main>
  );
}