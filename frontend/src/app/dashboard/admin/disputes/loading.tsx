export default function DisputesLoading() {
  return (
    <main className="space-y-4 p-4 sm:p-6 md:p-8" aria-busy="true" aria-label="Loading disputes">
      <div className="h-20 animate-pulse border border-mono-dark-grey bg-white/5" />
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-32 animate-pulse border border-mono-dark-grey bg-white/5" />
      ))}
    </main>
  );
}
