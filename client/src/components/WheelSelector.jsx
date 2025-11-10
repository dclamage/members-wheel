import PropTypes from 'prop-types';
import './WheelSelector.css';

const WheelSelector = ({ wheels, selectedWheelId, onSelect }) => {
  if (!wheels.length) {
    return <p className="wheel-selector__empty">No wheels yet. Create one from the admin panel.</p>;
  }

  return (
    <div className="wheel-selector">
      <label htmlFor="wheel-select">Choose a wheel</label>
      <select
        id="wheel-select"
        value={selectedWheelId ?? ''}
        onChange={(event) => onSelect(Number(event.target.value))}
      >
        {wheels.map((wheel) => (
          <option key={wheel.id} value={wheel.id}>
            {wheel.name}
          </option>
        ))}
      </select>
    </div>
  );
};

WheelSelector.propTypes = {
  wheels: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  selectedWheelId: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
};

WheelSelector.defaultProps = {
  selectedWheelId: null,
};

export default WheelSelector;
