import React from "react";
import PropTypes from "prop-types";

const ErrorMessage = ({
  error,
  onRetry,
  retryButtonText = "Spróbuj ponownie",
}) => {
  return (
    <div className="error-container text-center p-4">
      <div className="alert alert-danger" role="alert">
        <h5>Błąd połączenia</h5>
        <p>{error}</p>
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            {retryButtonText}
          </button>
        )}
      </div>
    </div>
  );
};

ErrorMessage.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
  retryButtonText: PropTypes.string,
};

export default ErrorMessage;
