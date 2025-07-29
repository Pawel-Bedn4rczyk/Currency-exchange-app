import React from "react";
import PropTypes from "prop-types";

const LoadingSpinner = ({ message = "Ładowanie danych..." }) => {
  return (
    <div className="loading-container">
      <div className="spinner" role="status">
        <span className="sr-only">Ładowanie...</span>
      </div>
      <p>{message}</p>
    </div>
  );
};

LoadingSpinner.propTypes = {
  message: PropTypes.string,
};

export default LoadingSpinner;
