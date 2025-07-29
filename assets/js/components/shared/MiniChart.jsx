import React from "react";
import PropTypes from "prop-types";
import {
  generateChartData,
  generateChartArea,
  generateChartCircles,
} from "../../utils/chartUtils.js";
import { getChangeColor } from "../../utils/formatters.js";

const MiniChart = ({ data, currency, index, isMobile = false }) => {
  if (!data || data.length === 0) {
    return (
      <div className={isMobile ? "no-data-message-mobile" : "no-data-message"}>
        <span>Brak danych</span>
      </div>
    );
  }

  const chartPoints = generateChartData(data);
  const chartArea = generateChartArea(chartPoints);
  const chartCircles = generateChartCircles(data);
  const gradientId = isMobile
    ? `gradient-mobile-${index}`
    : `gradient-${index}`;

  return (
    <div className={isMobile ? "mini-chart-mobile" : "mini-chart"}>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          ...(isMobile && { marginLeft: "10px" }),
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={getChangeColor(currency.change)}
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor={getChangeColor(currency.change)}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <polyline
          className="chart-line"
          points={chartPoints}
          stroke={getChangeColor(currency.change)}
          strokeWidth="2"
          fill="none"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
        <polygon
          className="chart-area"
          points={chartArea}
          fill={`url(#${gradientId})`}
        />
        {chartCircles.map((circle, circleIndex) => (
          <circle
            key={circleIndex}
            cx={circle.x}
            cy={circle.y}
            r="0.8"
            fill={getChangeColor(currency.change)}
            stroke="white"
            strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
};

MiniChart.propTypes = {
  data: PropTypes.array,
  currency: PropTypes.shape({
    change: PropTypes.number.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  isMobile: PropTypes.bool,
};

export default MiniChart;
