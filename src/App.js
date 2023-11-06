import React, { Component } from "react";
import "./App.css";
import winston_logger from "./logger.js";
// import axios from "axios";
import { Layout, Tabs, Icon, Row, Col } from "antd";

import {
  DittoDomClient,
  DomHttpBasicAuth,
  DefaultSearchOptions,
} from "@eclipse-ditto/ditto-javascript-client-dom";

//"@eclipse-ditto/ditto-javascript-client-dom"; //"../ditto-client-extensions/lib/api/dist/model/things.model.js";
//import { DomHttpBasicAuth } from "./build/dom/src/dom-auth.js";
//import { DefaultSearchOptions } from "./build/options/request.options.js";
//import { DittoDomClient } from "./build/dom/src/ditto-dom-client.js";

import { DeviceArea } from "./DeviceArea";
import { TrustAgentArea } from "./TrustAgentArea";
import { AssignmentArea } from "./AssignmentArea";
import { GlobalContext } from "./GlobalContext";

const { Footer, Content } = Layout;
const { TabPane } = Tabs;

// Ditto connection config
const ditto_domain = "localhost:8080";
const ditto_username = "ditto";
const ditto_password = "ditto";

const PROJECT = process.env.REACT_APP_PROJECT;
const PROJECT_URL = process.env["REACT_APP_" + PROJECT + "_URL"];
const PROJECT_LOGO = "../" + PROJECT.toLowerCase() + "_logo.png";

const logger = winston_logger.child({ source: "App.js" });
logger.info("Current project: " + PROJECT + " (" + PROJECT_URL + ")");

const ditto_client = DittoDomClient.newHttpClient()
  .withoutTls()
  .withDomain(ditto_domain)
  .withAuthProvider(
    DomHttpBasicAuth.newInstance(ditto_username, ditto_password)
  )
  .build();

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      //area: AreaEnum.GLOBAL,
      //templates: [],
      //variants: [],
      devices: [],
      physical_devices: [],
      virtual_devices: [],
      trust_agents: [],
      cyber_properties: [],
      //forEdit: null,
      //edited: null,
      //appliedDevices: {},
      //targetedDevices: {},
      //templateTags: {},
      //deviceTags: {},
      //deviceProperties: {},
      //activeDeployments: {},
      activeTab: "1",
      handleTabChange: this.handleTabChange,
      //addVariant: this.addVariant,
      //addTemplate: this.addTemplate,
      ditto_client,
    };
    this.Tabs = React.createRef();
  }

  componentDidMount() {
    this.initDittoClient().then((result) =>
      this.setState({ ditto_client: result })
    );
    /* this.getDeployments()
      .then((result) => this.setState({ deployments: result }))
      .then(() => this.getAppliedDevices())
      .then((result) => this.setState({ appliedDevices: result }))
      .then(() => this.getTargetedDevices())
      .then((result) => this.setState({ targetedDevices: result }))
      .then(() => this.getActiveDeployments())
      .then((result) => this.setState({ activeDeployments: result })); */
    this.getAllDevices().then((result) => this.setState({ devices: result }));

    this.getAllPhysicalDevices().then((result) =>
      this.setState({ physical_devices: result })
    );
    this.getAllVirtualDevices().then((result) =>
      this.setState({ virtual_devices: result })
    );
    this.getAllTrustAgents().then((result) =>
      this.setState({ trust_agents: result })
    );
    //.then(() => this.getDeviceTags())
    //.then((result) => this.setState({ deviceTags: result }))
    //.then(() => this.getDeviceProperties())
    //.then((result) => this.setState({ deviceProperties: result}));
    /* this.getTemplates()
      .then((result) => {
        this.setState({ templates: result });
      })
      .then(() => this.getTemplateTags())
      .then((result) => this.setState({ templateTags: result })); */
    /* this.getVariants().then((result) => {
      this.setState({ variants: result });
    }); */
    //this.getActiveDeployments();
  }

  handleTabChange = (tabNo) => {
    this.setState({ activeTab: tabNo });
  };

  render() {
    const { activeTab } = this.state;

    return (
      <GlobalContext.Provider value={this.state}>
        <div className="App">
          <Layout style={{ minHeight: "100vh" }}>
            {/* <Header></Header> */}

            <Content
              style={{ background: "#fff", padding: 0, textAlign: "left" }}
            >
              <Row>
                <Col span={12} offset={6}>
                  <Tabs
                    id="Tabs"
                    activeKey={activeTab}
                    ref={this.Tabs}
                    onTabClick={(tab) => this.handleTabChange(tab)}
                    // tabBarExtraContent={operations}
                  >
                    <TabPane
                      disabled
                      key="project-logo"
                      tab={
                        <span>
                          <img
                            style={{ height: "40px" }}
                            src={PROJECT_LOGO}
                            alt="Project logo"
                          />
                        </span>
                      }
                    ></TabPane>
                    <TabPane
                      key="1"
                      tab={
                        <span>
                          <Icon type="bulb" />
                          Devices
                        </span>
                      }
                    >
                      <DeviceArea
                      //devices={devices}
                      //deployments={deployments}
                      //activeDeployments={activeDeployments}
                      //appliedDevices={appliedDevices}
                      //deviceTags={deviceTags}
                      //callbackTabChange={this.handleTabChange}
                      />
                    </TabPane>
                    <TabPane
                      key="2"
                      tab={
                        <span>
                          <Icon type="safety-certificate" />
                          Trust Agents
                        </span>
                      }
                    >
                      <TrustAgentArea
                      //devices={devices}
                      //deployments={deployments}
                      //activeDeployments={activeDeployments}
                      //appliedDevices={appliedDevices}
                      //deviceTags={deviceTags}
                      //callbackTabChange={this.handleTabChange}
                      />
                    </TabPane>
                    <TabPane
                      key="3"
                      tab={
                        <span>
                          <Icon type="code-sandbox" />
                          Assignments
                        </span>
                      }
                    >
                      <AssignmentArea
                      //devices={devices}
                      //deployments={deployments}
                      //activeDeployments={activeDeployments}
                      //appliedDevices={appliedDevices}
                      //deviceTags={deviceTags}
                      //callbackTabChange={this.handleTabChange}
                      />
                    </TabPane>
                  </Tabs>
                </Col>
              </Row>
            </Content>

            <Footer>
              <p>
                This work is supported by <a href={PROJECT_URL}>{PROJECT}</a>{" "}
                and powered by{" "}
                <a href="https://www.eclipse.org/ditto/">Eclipse Ditto</a>.
              </p>
              <p>
                {" "}
                Please visit{" "}
                <a href="https://github.com/SINTEF-9012/ditto-fleet">
                  <Icon type="github" />
                </a>{" "}
                for further details.
              </p>
            </Footer>
          </Layout>
        </div>
      </GlobalContext.Provider>
    );
  }

  /**
   * Get all things from Ditto
   */
  getAllDevices = async () => {
    const searchHandle = ditto_client.getSearchHandle();

    var options = DefaultSearchOptions.getInstance()
      .withFilter(
        'in(attributes/type,"device","physical_device","virtual_device")'
      )
      .withSort("+thingId")
      .withLimit(0, 200);
    //searchHandle.search(options).then(result => console.log("returned",result.items))
    var devices = (await searchHandle.search(options)).items;
    //console.info(devices);
    logger.debug(JSON.stringify(devices));
    return devices;
  };

  /**
   * Get all physical things from Ditto
   */
  getAllPhysicalDevices = async () => {
    const searchHandle = ditto_client.getSearchHandle();

    var options = DefaultSearchOptions.getInstance()
      .withFilter('eq(attributes/type,"physical_device")')
      .withSort("+thingId")
      .withLimit(0, 200);
    //searchHandle.search(options).then(result => console.log("returned",result.items))
    var devices = (await searchHandle.search(options)).items;
    //console.info(devices);
    //logger.debug(JSON.stringify(devices));
    return devices;
  };

  /**
   * Get all virtual things from Ditto
   */
  getAllVirtualDevices = async () => {
    const searchHandle = ditto_client.getSearchHandle();

    var options = DefaultSearchOptions.getInstance()
      .withFilter('eq(attributes/type,"virtual_device")')
      .withSort("+thingId")
      .withLimit(0, 200);
    //searchHandle.search(options).then(result => console.log("returned",result.items))
    var devices = (await searchHandle.search(options)).items;
    //console.info(devices);
    //logger.debug(JSON.stringify(devices));
    return devices;
  };

  /**
   * Get all trust agents from Ditto
   */
  getAllTrustAgents = async () => {
    const searchHandle = ditto_client.getSearchHandle();

    var options = DefaultSearchOptions.getInstance()
      .withFilter(
        'in(attributes/type,"agent","trust_agent","trust_agent_docker","trust_agent_ssh","trust_agent_axis")'
      )
      .withSort("+thingId")
      .withLimit(0, 200);
    //searchHandle.search(options).then(result => console.log("returned",result.items))
    var trust_agents = (await searchHandle.search(options)).items;
    logger.debug(JSON.stringify(trust_agents));
    return trust_agents;
  };

  /**
   * Get all trust agents from Ditto
   */
  getAllAssignments = async () => {
    const searchHandle = ditto_client.getSearchHandle();

    var options = DefaultSearchOptions.getInstance()
      .withFilter('eq(attributes/type,"assignment")')
      .withSort("+thingId")
      .withLimit(0, 200);
    //searchHandle.search(options).then(result => console.log("returned",result.items))
    var assignments = (await searchHandle.search(options)).items;
    logger.debug(JSON.stringify(assignments));
    return assignments;
  };

 /*  populatePropertyTags = async () => {
    logger.info(this.state.devices);
    let cyber_properties = new Set();
    this.state.devices.forEach((device) => {
      if (device._features.hasOwnProperty("cyber")) {
        Object.entries(device._features.cyber._properties).forEach(
          ([key, value]) => {
            cyber_properties.add(key);
            //logger.info(key);
          }
        );
      }
    });
    cyber_properties.forEach(function (entry) {
      logger.info(entry);
    });
    let a = Array.from(cyber_properties);
    return a;
  }; */

  initDittoClient = async () => {
    const ditto_client = DittoDomClient.newHttpClient()
      .withoutTls()
      .withDomain(ditto_domain)
      .withAuthProvider(
        DomHttpBasicAuth.newInstance(ditto_username, ditto_password)
      )
      .build();
    return ditto_client;
  };
}

export default App;
