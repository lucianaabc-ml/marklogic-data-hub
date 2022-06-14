import {AuthoritiesContext, AuthoritiesService} from "../util/authorities";
import {render, waitForElement} from "@testing-library/react";

import {MemoryRouter} from "react-router-dom";
import {MissingPagePermission} from "../config/messages.config";
import Monitor from "./Monitor";
import React from "react";
import tiles from "../config/tiles.config";

describe("Monitor component", () => {

  test("Verify user with no authorities cannot access page", async () => {
    const authorityService = new AuthoritiesService();
    const {getByText} = await render(<MemoryRouter><AuthoritiesContext.Provider value={authorityService}><Monitor/></AuthoritiesContext.Provider></MemoryRouter>);

    expect(await(waitForElement(() => getByText(MissingPagePermission)))).toBeInTheDocument();
  });

  test("Verify user with right authorities can access page", async () => {
    const authorityService = new AuthoritiesService();
    authorityService.setAuthorities(["jobMonitor"]);

    const {getByText} = await render(<MemoryRouter><AuthoritiesContext.Provider value={authorityService}><Monitor/></AuthoritiesContext.Provider></MemoryRouter>);

    expect(getByText(tiles.monitor.intro!!)).toBeInTheDocument(); // tile intro text
  });

});
