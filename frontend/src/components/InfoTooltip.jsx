import Tooltip from './Tooltip';

export default function InfoTooltip({ text }) {
  return (
    <Tooltip text={text}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: 'var(--card-border)',
        color: 'var(--text-muted)',
        fontSize: '9px',
        fontWeight: 700,
        cursor: 'help',
        flexShrink: 0,
        lineHeight: 1,
        userSelect: 'none',
      }}>
        i
      </span>
    </Tooltip>
  );
}
