import PropTypes from 'prop-types';
import './WheelVisualizer.css';

const COLORS = ['#1d4ed8', '#9333ea', '#0ea5e9', '#22c55e', '#facc15', '#f97316', '#ef4444'];

const buildGradient = (entriesLength) => {
  if (!entriesLength) {
    return '#e2e8f0';
  }
  const anglePerEntry = 360 / entriesLength;
  const segments = Array.from({ length: entriesLength }, (_, index) => {
    const start = index * anglePerEntry;
    const end = start + anglePerEntry;
    const color = COLORS[index % COLORS.length];
    return `${color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${segments.join(', ')})`;
};

const WheelVisualizer = ({ entries, rotation, spinDuration, spinning }) => {
  const gradient = buildGradient(entries.length);

  return (
    <div className="wheel-visualizer">
      <div className="wheel-visualizer__pointer" />
      <div
        className="wheel-visualizer__wheel"
        style={{
          background: gradient,
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? `transform ${spinDuration}s cubic-bezier(0.33, 1, 0.68, 1)`
            : 'none',
        }}
      >
        {entries.length === 0 && <span className="wheel-visualizer__empty">Add entries to spin</span>}
      </div>
    </div>
  );
};

WheelVisualizer.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  rotation: PropTypes.number.isRequired,
  spinDuration: PropTypes.number.isRequired,
  spinning: PropTypes.bool,
};

WheelVisualizer.defaultProps = {
  spinning: false,
};

export default WheelVisualizer;
