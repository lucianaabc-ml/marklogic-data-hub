import React, {useEffect, useContext} from "react";
import axios from "axios";
import {Switch} from "react-router";
import {Route, Redirect, RouteComponentProps, withRouter} from "react-router-dom";
import {UserContext, default as UserProvider} from "@util/user-context";
import SearchProvider from "@util/search-context";
import ModelingProvider from "@util/modeling-context";
import CurationProvider from "@util/curation-context";
import LoadingProvider from "@util/loading-context";
import MonitorProvider from "@util/monitor-context";
import Header from "@components/header/header";
import Footer from "@components/footer/footer";
import Login from "./pages/Login";
import TilesView from "./pages/TilesView";
import NoMatchRedirect from "./pages/noMatchRedirect";
import NoResponse from "./pages/NoResponse";
import ModalStatus from "@components/modal-status/modal-status";
import NavigationPrompt from "@components/navigation-prompt/navigation-prompt";

import "./App.scss";
import {Application} from "@config/application.config";
import {themes, themeMap} from "@config/themes.config";
import {getEnvironment} from "@util/environment";
import ErrorMessageProvider from "@util/error-message-context";
import HubCentralConfigProvider from "@util/hubCentralConfig-context";
import ErrorBoundary from "@components/error-boundary/ErrorBoundary";

interface Props extends RouteComponentProps<any> { }

const App: React.FC<Props> = ({history, location}) => {
  const {
    user,
    authed,
    handleError
  } = useContext(UserContext);

  const PrivateRoute = ({children, ...rest}) => (
    <Route {...rest} render={props => (
      authed === true ? (
        children
      ) : (
        <Redirect push={true} to={{
          pathname: "/",
          state: {from: props.location}
        }} />
      )
    )} />
  );

  const getPageRoute = (loc) => {
    if (loc.search && loc.search.startsWith("?from=")) {
      return decodeURIComponent(loc.search.substring(6));
    } else if (loc.pathname !== "/" && loc.pathname !== "/noresponse") {
      return loc.pathname;
    } else {
      return user.pageRoute;
    }
  };

  useEffect(() => {
    console.log("App: authed effect", {User: user, History: history, Location: location, isAuthed: authed});
    if (authed) {
      if (location.pathname === "/") {
        history.push(user.pageRoute);
      } else if (location.pathname === "/tiles/run/add" || location.pathname === "/tiles/run/add-run" || location.pathname === "/tiles/run/run-step") {
        history.push("/tiles/run");
      } else {
        history.push(location.pathname);
      }
    } else {
      if (user.error.type !== "") {
        history.push("/error");
      }
      user.pageRoute = getPageRoute(location);
    }
  }, [authed]);

  useEffect(() => {
    console.log({User: user, History: history, Location: location});
    // On route change...
    if (authed) {
      axios.get("/api/environment/systemInfo")
        .then(res => { })
        // Timeouts throw 401s and are caught here
        .catch(err => {
          if (err.response) {
            handleError(err);
          } else {
            history.push("/noresponse");
          }
        });
    }
  }, [location.pathname]);

  const path = location["pathname"];
  const pageTheme = (themeMap[path]) ? themes[themeMap[path]] : themes["default"];
  document.body.classList.add(pageTheme["bodyBg"]);
  document.title = Application.title;

  return (
    <div id="background" style={pageTheme["background"]}>
      <MonitorProvider>
        <SearchProvider>
          <ModelingProvider>
            <CurationProvider>
              <LoadingProvider>
                <HubCentralConfigProvider>
                  <ErrorMessageProvider>
                    <Header environment={getEnvironment()} />
                    <ModalStatus />
                    <NavigationPrompt />
                    <main>
                      <ErrorBoundary>
                        <div className="contentContainer">
                          <Switch>
                            <Route path="/" exact component={Login} />
                            <Route path="/noresponse" exact component={NoResponse} />
                            <PrivateRoute path="/tiles" exact>
                              <TilesView />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/load" exact>
                              <TilesView id="load" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/model" exact>
                              <TilesView id="model" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/curate" exact>
                              <TilesView id="curate" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/curate/match" exact>
                              <TilesView id="curate" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/curate/merge" exact>
                              <TilesView id="curate" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/curate/map" exact>
                              <TilesView id="curate" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/run" exact>
                              <TilesView id="run" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/run/add" exact>
                              <TilesView id="run" routeToFlow={true} addingStepToFlow={true} startRunStep={false} />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/run/add-run" exact>
                              <TilesView id="run" routeToFlow={true} addingStepToFlow={true} startRunStep={true} />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/run/run-step" exact>
                              <TilesView id="run" routeToFlow={true} addingStepToFlow={false} startRunStep={true} />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/explore" exact>
                              <TilesView id="explore" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/explore/detail">
                              <TilesView id="detail" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/monitor">
                              <TilesView id="monitor" />
                            </PrivateRoute>
                            <PrivateRoute path="/tiles/bootstrap">
                              <TilesView id="bootstrap" />
                            </PrivateRoute>
                            <Route component={NoMatchRedirect} />
                          </Switch>
                          <Footer pageTheme={pageTheme} />
                        </div>
                      </ErrorBoundary>
                    </main>
                  </ErrorMessageProvider>
                </HubCentralConfigProvider>
              </LoadingProvider>
            </CurationProvider>
          </ModelingProvider>
        </SearchProvider>
      </MonitorProvider>
    </div>

  );
};

export default withRouter(App);
