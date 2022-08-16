import React, { Component } from "react";
import "./App.css";
import axios from "axios";
import { Layout, Tabs, Icon, Row, Col } from "antd";

import {
  DittoDomClient,
  DomHttpBasicAuth,
  DefaultSearchOptions,
} from "@eclipse-ditto/ditto-javascript-client-dom";
//import { TemplateArea2 } from "./TemplateArea2";
//import { VariantArea2 } from "./VariantArea2";
import { TrustAgentArea } from "./TrustAgentArea";
import { DeviceArea } from "./DeviceArea";
import { SandboxArea } from "./SandboxArea";
//import { ControlArea } from "./ControlArea";
//import { ModelArea } from "./ModelArea";
//import { DiversificationArea } from "./SMTDiversificationArea/DiversificationArea";
//import SingleDeploymentArea from "./ORDiversificationArea/SingleDeploymentArea";
//import MultipleDeploymentArea from "./ORDiversificationArea/MultipleDeploymentArea";
import { GlobalContext } from "./GlobalContext";

const { Footer, Content } = Layout;
const { TabPane } = Tabs;

//const PROPERTIES2SHOW = ['properties.arduino', 'properties.city'];

const ditto_domain = "localhost:8080";
const ditto_username = "ditto";
const ditto_password = "ditto";

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
      trust_agents: [],
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
    this.initDittoClient().then((result) => this.setState({ ditto_client: result}))
    /* this.getDeployments()
      .then((result) => this.setState({ deployments: result }))
      .then(() => this.getAppliedDevices())
      .then((result) => this.setState({ appliedDevices: result }))
      .then(() => this.getTargetedDevices())
      .then((result) => this.setState({ targetedDevices: result }))
      .then(() => this.getActiveDeployments())
      .then((result) => this.setState({ activeDeployments: result })); */
    this.getDevices().then((result) => this.setState({ devices: result }));
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
    const { devices, trust_agents, activeTab } = this.state;

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
                            src="https://eratosthenes-project.eu/wp-content/uploads/2021/09/eratosthenis_l14a-300x69.png"
                            alt="logo eratosthenes"
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
                          Sandbox
                        </span>
                      }
                    >
                      <SandboxArea
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
                This work is supported by{" "}
                <a href="https://eratosthenes-project.eu/">ERATOSTHENES</a> and
                powered by{" "}
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
   * Get all devices from Ditto
   */
  getDevices = async () => {
    const searchHandle = ditto_client.getSearchHandle();

    var options = DefaultSearchOptions.getInstance().withLimit(0, 200);
    options = options.withSort("+thingId");
    //searchHandle.search(options).then(result => console.log("returned",result.items))
    var devices = (await searchHandle.search(options)).items;
    console.info(devices);
    return devices;
  };

  getTrustAgents = async () => {
    //TODO: fetch available trust agents from somewhere
    var trust_agents = {};
    return trust_agents;
  };

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
