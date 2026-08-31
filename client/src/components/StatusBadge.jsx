export default function StatusBadge({ status }) {
  const label = status === 'completed' ? 'Completed' : 'In Progress';
  const cls = status === 'completed' ? 'badge badge-green' : 'badge badge-yellow';
  return <span className={cls}>{label}</span>;
}
