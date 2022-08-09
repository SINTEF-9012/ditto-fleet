import React, { Component } from "react";
import { Button, Layout, Menu, Icon } from "antd";
import axios from "axios";
import {
  ContentAreaEnum,
  DeploymentDeviceArea,
  ProductionArea,
  PreviewArea,
  DiversifyArea
} from "./ContentAreas";

const { Sider, Content } = Layout;

export class ControlArea extends Component {
  constructor(props) {
    super(props);
    this.state = {
      contentarea: ContentAreaEnum.DEPLOYMENTDEVICE
    };
  }

  componentDidMount() {}

  render() {
    return (
      <div>
        <Layout>
          <Sider>
            {/* Buttons to interact with API */}
            <Menu defaultSelectedKeys={["1"]} mode="inline" theme="dark">
              <Menu.Item key="1" onClick={this.production}>
                <Icon type="build" />
                <span>Production</span>
              </Menu.Item>
              <Menu.Item key="2" onClick={this.preview}>
                <Icon type="experiment" />
                <span>Preview</span>
              </Menu.Item>
              <Menu.Item key="3" onClick={this.diversify}>
                <Icon type="deployment-unit" />
                <span>Diversify</span>
              </Menu.Item>
            </Menu>
          </Sider>

          <Content>
            {this.state.contentarea === ContentAreaEnum.DEPLOYMENTDEVICE && (
              <DeploymentDeviceArea />
            )}
            {this.state.contentarea === ContentAreaEnum.PRODUCTION && (
              <ProductionArea />
            )}
            {this.state.contentarea === ContentAreaEnum.PREVIEW && (
              <PreviewArea />
            )}
            {this.state.contentarea === ContentAreaEnum.DIVERSIFY && (
              <DiversifyArea />
            )}
            {this.state.contentarea === ContentAreaEnum.DEFAULT && (
              <Button>Hey</Button>
            )}
          </Content>
        </Layout>
      </div>
    );
  }

  async getDevices() {
    return (await axios.get("api/device/")).data;
  }

  async getDeployments() {
    return (await axios.get("api/deployment")).data;
  }

  production = async () => {
    this.setState({
      contentarea: ContentAreaEnum.PRODUCTION
    });
  };

  preview = async () => {
    this.setState({
      contentarea: ContentAreaEnum.PREVIEW
    });
  };

  diversify = async () => {
    this.setState({
      contentarea: ContentAreaEnum.DIVERSIFY
    });
  };

  deleteAllDeployments = async () => {
    let result = await axios.delete("api/deployment/");
    console.log(result);
    this.setState({
      contentarea: ContentAreaEnum.DEFAULT
    });
  };
}
