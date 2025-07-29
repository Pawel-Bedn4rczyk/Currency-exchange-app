import React from "react";
import PropTypes from "prop-types";
import { formatPercentage, getChangeClass } from "../../utils/formatters.js";

const PercentageChange = ({ change, currencyCode, showArrow = true }) => {
  return (
    <span className={getChangeClass(change)}>
      {change > 0 ? "+" : ""}
      {formatPercentage(change, currencyCode)}%
      {showArrow && change !== 0 && <span>{change > 0 ? "↗" : "↘"}</span>}
    </span>
  );
};

PercentageChange.propTypes = {
  change: PropTypes.number.isRequired,
  currencyCode: PropTypes.string.isRequired,
  showArrow: PropTypes.bool,
};

export default PercentageChange;
