import KeyBanner from './_components/KeyBanner';
import ReflectionApp from './_components/ReflectionApp';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <a href="#main" className="koor-skip">
        skip to content
      </a>
      <KeyBanner />
      <main id="main">
        <ReflectionApp />
      </main>
    </div>
  );
}
