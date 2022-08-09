import React, { Component } from "react";
import { Button, Layout, Menu, Icon } from "antd";
import axios from "axios";
import { ContentAreaEnum, PreviewArea } from "./ContentAreas";
import {
  ModelContentAreaEnum,
  TemplateArea,
  VariantArea
} from "./ModelContentArea";

const { Sider, Content } = Layout;

export class ModelArea extends Component {
  constructor(props) {
    super(props);
    this.state = {
      contentarea: ModelContentAreaEnum.TEMPLATE
    };
  }

  componentDidMount() {}

  render() {
    const { contentarea } = this.state;

    return (
      <div>
        <Layout>
          <Sider>
            {/* Buttons to interact with API */}
            <Menu defaultSelectedKeys={["1"]} mode="inline" theme="dark">
              <Menu.Item key="1" onClick={this.templates}>
                <Icon type="book" />
                <span>Templates</span>
              </Menu.Item>
              <Menu.Item key="2" onClick={this.variants}>
                <Icon type="branches" />
                <span>Variants</span>
              </Menu.Item>
              <Menu.Item key="3">
                <Icon type="deployment-unit" />
                <span>Diversify</span>
              </Menu.Item>
            </Menu>
          </Sider>

          <Content>
            {contentarea === ModelContentAreaEnum.TEMPLATE && <TemplateArea />}
            {contentarea === ModelContentAreaEnum.VARIANT && <VariantArea />}
            {contentarea === ContentAreaEnum.PREVIEW && <PreviewArea />}
            {contentarea === ContentAreaEnum.DEFAULT && <Button>Hey</Button>}
          </Content>
        </Layout>
      </div>
    );
  }

  templates = () => {
    this.setState({
      contentarea: ModelContentAreaEnum.TEMPLATE
    });
  };

  variants = () => {
    this.setState({
      contentarea: ModelContentAreaEnum.VARIANT
    });
  };

  async getDevices() {
    return (await axios.get("api/device/")).data;
  }

  production = async () => {
    this.setState({
      contentarea: ContentAreaEnum.PRODUCTION
    });
  };
}
