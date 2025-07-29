import React, { Component } from "react";
import { Route, Redirect, Switch } from "react-router-dom";
import ExchangeRatesDashboard from "./ExchangeRatesDashboard.jsx";

class Home extends Component {
  render() {
    return (
      <div>
        <Switch>
          <Redirect exact from="/" to="/dashboard" />
          <Route path="/dashboard" component={ExchangeRatesDashboard} />
        </Switch>
      </div>
    );
  }
}

export default Home;
