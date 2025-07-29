import React from "react";
import PropTypes from "prop-types";

const CurrencyIcon = ({ currency }) => {
  const getIcon = (code) => {
    switch (code) {
      case "EUR":
        return "€";
      case "USD":
        return "$";
      case "IDR":
        return "₹";
      case "CZK":
        return "CZK";
      case "BRL":
        return "R$";
      default:
        return code;
    }
  };

  return (
    <div className={`currency-icon ${currency.toLowerCase()}`}>
      {getIcon(currency)}
    </div>
  );
};

CurrencyIcon.propTypes = {
  currency: PropTypes.string.isRequired,
};

export default CurrencyIcon;
