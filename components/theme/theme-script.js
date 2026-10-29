export default function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('ptp-theme');document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} suppressHydrationWarning />;
}
