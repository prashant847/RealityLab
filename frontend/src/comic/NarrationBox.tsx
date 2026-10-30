export function NarrationBox({ text }: { text: string }) {
  return (
    <div className="narration" role="note">
      <p>{text}</p>
    </div>
  );
}
