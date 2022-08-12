import React, { Component } from "react";
import "./App.css";
import axios from "axios";
import { Layout, Tabs, Icon } from "antd";

import { DittoDomClient, DomHttpBasicAuth, DefaultSearchOptions } from "@eclipse-ditto/ditto-javascript-client-dom";
//import { TemplateArea2 } from "./TemplateArea2";
//import { VariantArea2 } from "./VariantArea2";
import { TrustAgentArea } from "./TrustAgentArea";
import { DeviceArea } from "./DeviceArea";
import { DashboardArea } from "./DashboardArea";
//import { ControlArea } from "./ControlArea";
//import { ModelArea } from "./ModelArea";
//import { DiversificationArea } from "./SMTDiversificationArea/DiversificationArea";
//import SingleDeploymentArea from "./ORDiversificationArea/SingleDeploymentArea";
//import MultipleDeploymentArea from "./ORDiversificationArea/MultipleDeploymentArea";
import { GlobalContext } from "./GlobalContext";

const { Footer, Content } = Layout;
const { TabPane } = Tabs;

//const PROPERTIES2SHOW = ['properties.arduino', 'properties.city'];

const ditto_domain = 'localhost:8080';
const ditto_username = 'ditto';
const ditto_password = 'ditto';

const ditto_client = DittoDomClient.newHttpClient()
            .withoutTls()
            .withDomain(ditto_domain)
            .withAuthProvider(DomHttpBasicAuth.newInstance(ditto_username, ditto_password))
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
    };
    this.Tabs = React.createRef();
  }

  componentDidMount() {
    /* this.getDeployments()
      .then((result) => this.setState({ deployments: result }))
      .then(() => this.getAppliedDevices())
      .then((result) => this.setState({ appliedDevices: result }))
      .then(() => this.getTargetedDevices())
      .then((result) => this.setState({ targetedDevices: result }))
      .then(() => this.getActiveDeployments())
      .then((result) => this.setState({ activeDeployments: result })); */
    this.getDevices()
      .then((result) => this.setState({ devices: result }));
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
    const {
      //deployments,
      devices,
      //templates,
      //variants,
      //appliedDevices,
      //targetedDevices,
      //activeDeployments,
      //templateTags,
      //deviceTags,
      activeTab,
    } = this.state;

    return (
      <GlobalContext.Provider value={this.state}>
        <div className="App">
          <Layout style={{ minHeight: "100vh" }}>
            {/* <Header></Header> */}

            <Content
              style={{ background: "#fff", padding: 0, textAlign: "left" }}
            >
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
                      <Icon type="dashboard" />
                      Dashboard
                    </span>
                  }
                >
                  <DashboardArea
                    //devices={devices}
                    //deployments={deployments}
                    //activeDeployments={activeDeployments}
                    //appliedDevices={appliedDevices}
                    //deviceTags={deviceTags}
                    //callbackTabChange={this.handleTabChange}
                  />
                </TabPane>
              </Tabs>
            </Content>

            <Footer>
              <p>
                This work is supported by{" "}
                <a href="https://eratosthenes-project.eu/">ERATOSTHENES</a> and powered by <a href="https://www.eclipse.org/ditto/">Eclipse Ditto</a>.
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

  /* createDeployment = () => {
    const deployment = prompt("Enter your deployment: ");
    if (!deployment) return;
    axios
      .post("/api/deployments/create", { deployment })
      .then((res) =>
        this.setState({
          deployments: [...this.state.deployments, res.data.newDeployment],
        })
      )
      .catch((err) =>
        alert(`Failed to create deployment\n${JSON.stringify(err)}`)
      );
  }; */

  /* deleteDeployments = () => {
    this.setState({ deployments: [] });
    const doDelete = window.confirm("Delete all deployments?");
    if (!doDelete) return;
    axios
      .delete("/api/deployments/")
      .then((res) => this.setState({ deployments: [] }))
      .catch((err) =>
        alert(`Failed to delete all deployments\n${JSON.stringify(err)}`)
      );
  }; */
  
  /**
   * Get all devices in the managed fleet
   */
  getDevices = async () => {
    
    const searchHandle = ditto_client.getSearchHandle();
    
    var options = DefaultSearchOptions.getInstance().withLimit(0,200);
    options = options.withSort("+thingId");
    //searchHandle.search(options).then(result => console.log("returned",result.items))
    var devices = (await searchHandle.search(options)).items;
    console.info(devices);
    return devices;
  };

  
  /**
   * Get a map of devices and active deployments.
   */
  /* getActiveDeployments = async () => {
    let result = {};
    //let deployments = (await axios.get('api/deployment')).data;
    this.state.deployments.forEach(async (deployment) => {
      //result[deployment.id]
      let devices = (
        await axios.get("api/deployment/" + deployment.id + "/applied")
      ).data;
      devices.forEach((device) => {
        result[device.deviceId] = [deployment.id];
      });
    });
    console.log(result);
    return result;
  }; */

  /**
   * Get a map of deployments and devices to which they apply.
   */
  /* getAppliedDevices = async () => {
    let result = {};
    //let deployments = (await axios.get('api/deployment')).data;
    this.state.deployments.forEach(async (deployment) => {
      result[deployment.id] = (
        await axios.get("api/deployment/" + deployment.id + "/applied")
      ).data;
    });
    return result;
  }; */

  /**
   * Get a map of deployments and devices at which they target (but not necessarily applied yet).
   */
  /* getTargetedDevices = async () => {
    let result = {};
    //let deployments = (await axios.get('api/deployment')).data;
    this.state.deployments.forEach(async (deployment) => {
      result[deployment.id] = (
        await axios.get("api/deployment/" + deployment.id + "/targeted")
      ).data;
    });
    return result;
  }; */

  /**
   * Get tags for each template in the MongoDB.
   */
  /* getTemplateTags = async () => {
    let result = {};
    this.state.templates.forEach((template) => {
      result[template.id] = template.property.predefinedtag;
    });
    return result;
  }; */

  /**
   * Get tags for each device in the IoT hub.
   */
  /* getDeviceTags = async () => {
    let result = {};
    this.state.devices.forEach((device) => {
      console.log(device);
      result[device.id] = device.tags;
    });
    //console.log(result);
    return result;
  }; */

  /* getDeviceProperties = async () =>{
    let result = {};
    this.state.devices.forEach((device) => {
      let toshow = {}
      for(let key of PROPERTIES2SHOW){
        if(key in device.properties){
          toshow[key] = device.properties[key]
        }
      }
      result[device.id] = toshow
    });
    return result;
  } */

  /**
   * Add new template (either by copying or creating a new one)
   */
  /* addTemplate = async (newTemplate) => {
    this.setState({
      templates: [...this.state.templates, newTemplate],
    });
  }; */

  /**
   * Add new variant (either by copying or creating a new one)
   */
  /* addVariant = async (newVariant) => {
    this.setState({
      variants: [...this.state.variants, newVariant],
    });
  }; */
}

export default App;
