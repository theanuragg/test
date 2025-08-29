import dynamic from 'next/dynamic';
import Page from '@/components/ui/Page/Page';

// Avoid SSR issues on refresh by rendering Explore client-side only
const Explore = dynamic(() => import('@/components/Explore'), { ssr: false });

export default function Index() {
  return (
    <Page>
      <Explore />
    </Page>
  );
}
