import React, { Component } from "react";
import "./App.css";
import axios from "axios";
import { Layout, Tabs, Icon } from "antd";

import { TemplateArea2 } from "./TemplateArea2";
import { VariantArea2 } from "./VariantArea2";
import { DeploymentArea } from "./DeploymentArea";
import { DeviceArea } from "./DeviceArea";
import { ControlArea } from "./ControlArea";
import { ModelArea } from "./ModelArea";
import { DiversificationArea } from "./SMTDiversificationArea/DiversificationArea";
import SingleDeploymentArea from "./ORDiversificationArea/SingleDeploymentArea";
import MultipleDeploymentArea from "./ORDiversificationArea/MultipleDeploymentArea";
import { GlobalContext } from "./GlobalContext";

const { Footer, Content } = Layout;
const { TabPane } = Tabs;

const PROPERTIES2SHOW = ['properties.arduino', 'properties.city'];

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      //area: AreaEnum.GLOBAL,
      deployments: [],
      templates: [],
      variants: [],
      devices: [],
      //forEdit: null,
      //edited: null,
      appliedDevices: {},
      targetedDevices: {},
      templateTags: {},
      deviceTags: {},
      deviceProperties: {},
      activeDeployments: {},
      activeTab: "1",
      handleTabChange: this.handleTabChange,
      addVariant: this.addVariant,
      addTemplate: this.addTemplate,
    };
    this.Tabs = React.createRef();
  }

  componentDidMount() {
    this.getDeployments()
      .then((result) => this.setState({ deployments: result }))
      .then(() => this.getAppliedDevices())
      .then((result) => this.setState({ appliedDevices: result }))
      .then(() => this.getTargetedDevices())
      .then((result) => this.setState({ targetedDevices: result }))
      .then(() => this.getActiveDeployments())
      .then((result) => this.setState({ activeDeployments: result }));
    this.getDevices()
      .then((result) => this.setState({ devices: result }))
      .then(() => this.getDeviceTags())
      .then((result) => this.setState({ deviceTags: result }))
      .then(() => this.getDeviceProperties())
      .then((result) => this.setState({ deviceProperties: result}));
    this.getTemplates()
      .then((result) => {
        this.setState({ templates: result });
      })
      .then(() => this.getTemplateTags())
      .then((result) => this.setState({ templateTags: result }));
    this.getVariants().then((result) => {
      this.setState({ variants: result });
    });
    //this.getActiveDeployments();
  }

  handleTabChange = (tabNo) => {
    this.setState({ activeTab: tabNo });
  };

  render() {
    const {
      deployments,
      devices,
      templates,
      variants,
      appliedDevices,
      targetedDevices,
      activeDeployments,
      templateTags,
      deviceTags,
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
                  key="logo"
                  tab={
                    <span>
                      <img
                        style={{ height: "40px" }}
                        src="https://enact-project.eu/img/logo-enact-blue2.png"
                        alt="logo enact"
                      />
                    </span>
                  }
                ></TabPane>
                <TabPane
                  key="1"
                  tab={
                    <span>
                      <Icon type="book" />
                      Templates
                    </span>
                  }
                >
                  <TemplateArea2
                    //templates={templates}
                    //variants={variants}
                    //templateTags={templateTags}
                    //callbackTabChange={this.handleTabChange}
                    //callbackAddTemplate={this.addTemplate}
                  />
                </TabPane>
                <TabPane
                  key="2"
                  tab={
                    <span>
                      <Icon type="branches" />
                      Variants
                    </span>
                  }
                >
                  <VariantArea2
                    //variants={variants}
                    //templates={templates}
                    //callbackTabChange={this.handleTabChange}
                    //callbackAddVariant={this.addVariant}
                  />
                </TabPane>
                <TabPane
                  key="3"
                  tab={
                    <span>
                      <Icon type="deployment-unit" />
                      Deployments
                    </span>
                  }
                >
                  <DeploymentArea
                    //deployments={deployments}
                    //appliedDevices={appliedDevices}
                    //targetedDevices={targetedDevices}
                    //callbackTabChange={this.handleTabChange}
                  />
                </TabPane>
                <TabPane
                  key="4"
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
                {/* <TabPane
                  key="5"
                  tab={
                    <span>
                      <Icon type="control" />
                      Control
                    </span>
                  }
                >
                  <ControlArea />
                </TabPane> */}
               {/*  <TabPane
                  key="6"
                  tab={
                    <span>
                      <Icon type="profile" />
                      Repository
                    </span>
                  }
                >
                  <ModelArea />
                </TabPane> */}
                <TabPane
                  key="7"
                  tab={
                    <span>
                      <Icon type="code" />
                      Z3
                    </span>
                  }
                >
                  <DiversificationArea
                    //callbackTabChange={this.handleTabChange}
                  />
                </TabPane>
                {/* <TabPane
                key="8"
                tab={
                  <span>
                    <Icon type="control" />
                    Single Deployment
                  </span>
                }
              >
                <SingleDeploymentArea
                  //devices={devices}
                  //variants={variants}
                  //deployments={deployments}
                  //activeDeployments={activeDeployments}
                  //appliedDevices={appliedDevices}
                  //deviceTags={deviceTags}
                  //callbackTabChange={this.handleTabChange}
                />
              </TabPane> */}
                {/* <TabPane
                  key="9"
                  tab={
                    <span>
                      <Icon type="control" />
                      OR-Tools
                    </span>
                  }
                >
                  <MultipleDeploymentArea
                    // devices={devices}
                    // variants={variants}
                    // deployments={deployments}
                    // activeDeployments={activeDeployments}
                    // appliedDevices={appliedDevices}
                    // deviceTags={deviceTags}
                    // callbackTabChange={this.handleTabChange}
                  />
                </TabPane> */}
              </Tabs>
            </Content>

            <Footer>
              <p>
                This work is supported by{" "}
                <a href="https://www.enact-project.eu/">ENACT</a>.
              </p>
              <p>
                {" "}
                Please visit{" "}
                <a href="https://github.com/SINTEF-9012/divenact">
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

  createDeployment = () => {
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
  };

  deleteDeployments = () => {
    this.setState({ deployments: [] });
    const doDelete = window.confirm("Delete all deployments?");
    if (!doDelete) return;
    axios
      .delete("/api/deployments/")
      .then((res) => this.setState({ deployments: [] }))
      .catch((err) =>
        alert(`Failed to delete all deployments\n${JSON.stringify(err)}`)
      );
  };

  // seedDeployments = () => {
  //   const doSeed = window.confirm('Do you want to seed random data?');
  //   if (!doSeed) return;
  //   axios
  //     .post('/api/deployments/seed', {})
  //     .then(() => {
  //       axios
  //         .get('/api/deployments/')
  //         .then(res => this.setState({ deployments: res.data }))
  //         .catch(alert);
  //     })
  //     .catch(alert);
  // };

  /**
   * Get edge devices in the IoT Hub
   */
  getDevices = async () => {
    return (await axios.get("api/device/")).data;
  };

  /**
   * Get deployments in the IoT Hub
   */
  getDeployments = async () => {
    return (await axios.get("api/deployment")).data;
  };

  /**
   * Get variants stored in MongoDB
   */
  getVariants = async () => {
    return (await axios.get("api/variant/")).data;
  };

  /**
   * Get variants stored in MongoDB
   */
  getTemplates = async () => {
    return (await axios.get("api/template/")).data;
  };

  /**
   * Get a map of devices and active deployments.
   */
  getActiveDeployments = async () => {
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
  };

  /**
   * Get a map of deployments and devices to which they apply.
   */
  getAppliedDevices = async () => {
    let result = {};
    //let deployments = (await axios.get('api/deployment')).data;
    this.state.deployments.forEach(async (deployment) => {
      result[deployment.id] = (
        await axios.get("api/deployment/" + deployment.id + "/applied")
      ).data;
    });
    return result;
  };

  /**
   * Get a map of deployments and devices at which they target (but not necessarily applied yet).
   */
  getTargetedDevices = async () => {
    let result = {};
    //let deployments = (await axios.get('api/deployment')).data;
    this.state.deployments.forEach(async (deployment) => {
      result[deployment.id] = (
        await axios.get("api/deployment/" + deployment.id + "/targeted")
      ).data;
    });
    return result;
  };

  /**
   * Get tags for each template in the MongoDB.
   */
  getTemplateTags = async () => {
    let result = {};
    this.state.templates.forEach((template) => {
      result[template.id] = template.property.predefinedtag;
    });
    return result;
  };

  /**
   * Get tags for each device in the IoT hub.
   */
  getDeviceTags = async () => {
    let result = {};
    this.state.devices.forEach((device) => {
      console.log(device);
      result[device.id] = device.tags;
    });
    //console.log(result);
    return result;
  };


  getDeviceProperties = async () =>{
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
  }

  /**
   * Add new template (either by copying or creating a new one)
   */
  addTemplate = async (newTemplate) => {
    this.setState({
      templates: [...this.state.templates, newTemplate],
    });
  };

  /**
   * Add new variant (either by copying or creating a new one)
   */
  addVariant = async (newVariant) => {
    this.setState({
      variants: [...this.state.variants, newVariant],
    });
  };
}

export default App;
