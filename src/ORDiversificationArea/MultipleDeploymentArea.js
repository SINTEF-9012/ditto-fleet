import React, { Component } from "react";
import MainForm from "./MainForm";
import { Tabs, Steps, Table, Badge, Form, Button, Row, Col } from "antd";
import { GlobalContext } from "../GlobalContext";

const { Step } = Steps;
const { TabPane } = Tabs;

// const genExtra = () => (
//   <Icon
//     type="SettingOutlined "
//     onClick={event => {
//       // If you don't want click extra trigger collapse, you can prevent this:
//       event.stopPropagation();
//     }}
//   />
// );

class MultipleDeploymentArea extends Component {
  static contextType = GlobalContext;

  constructor(props) {
    super(props);
    this.newTabIndex = 0;
    this.variantColumns = [
      {
        title: "Variant ID",
        dataIndex: "id",
        width: 500
      }
    ];
    this.nestedDeviceColumns = [
      {
        title: "Matching devices",
        dataIndex: "id",
        render: (text, record) => (
          <Button
            type="link"
            icon="branches"
            onClick={() => this.context.handleTabChange("2")}
          >
            {record.id}
          </Button>
        )
      }
    ];
    const panes = [
      {
        title: "Deployment 1",
        content: (
          <MainForm
            variants={this.context.variants}
            devices={this.context.devices}
            tags={this.context.deviceTags}
            form={this.context.form}
            deployments={this.context.deployments}
            activeDeployments={this.context.activeDeployments}
            appliedDevices={this.context.appliedDevices}
            deviceTags={this.context.deviceTags}
            callbackTabChange={this.context.handleTabChange}
          />
        ),
        key: "1"
      }
    ];
    this.state = {
      //add if needed
      matchingDevices: [],
      devices: this.context.devices,
      currentStep: 0,
      selectedVariantRowKeys: [],
      expandIconPosition: "left",
      activeKey: panes[0].key,
      panes
    };
  }

  next = () => {
    //const { selectedVariantRowKeys } = this.state;
    //const { matchingDevices } = this.state;
    switch (this.state.currentStep) {
      case 0:
        const currentStep = this.state.currentStep + 1;
        this.setState({ currentStep });
        break;
      case 1:
        break;
      default:
    }
  };

  prev = () => {
    const currentStep = this.state.currentStep - 1;
    this.setState({ currentStep });
  };

  onChange = activeKey => {
    this.setState({ activeKey });
  };

  onEdit = (targetKey, action) => {
    this[action](targetKey);
  };

  add = () => {
    const { panes } = this.state;
    const activeKey = `newTab${this.newTabIndex++}`;
    panes.push({
      title: "Deployment " + (panes.length + 1),
      content: (
        <MainForm
          variants={this.context.variants}
          devices={this.context.devices}
          tags={this.context.deviceTags}
          form={this.context.form}
          deployments={this.context.deployments}
          activeDeployments={this.context.activeDeployments}
          appliedDevices={this.context.appliedDevices}
          deviceTags={this.context.deviceTags}
          callbackTabChange={this.context.handleTabChange}
        />
      ),
      key: activeKey
    });
    this.setState({ panes, activeKey });
  };

  remove = targetKey => {
    let { activeKey } = this.state;
    let lastIndex;
    this.state.panes.forEach((pane, i) => {
      if (pane.key === targetKey) {
        lastIndex = i - 1;
      }
    });
    const panes = this.state.panes.filter(pane => pane.key !== targetKey);
    if (panes.length && activeKey === targetKey) {
      if (lastIndex >= 0) {
        activeKey = panes[lastIndex].key;
      } else {
        activeKey = panes[0].key;
      }
    }
    this.setState({ panes, activeKey });
  };

  render() {
    const { currentStep } = this.state;
    const steps = [
      {
        title: "Configure multiple deployments",
        status: "process",
        content: (
          <Tabs
            onChange={this.onChange}
            activeKey={this.state.activeKey}
            type="editable-card"
            onEdit={this.onEdit}
          >
            {this.state.panes.map(pane => (
              <TabPane
                tab={
                  <span>
                    <Badge status="processing" />
                    {pane.title}
                  </span>
                }
                key={pane.key}
                closable={pane.closable}
              >
                {pane.content}
              </TabPane>
            ))}
          </Tabs>
        )
      },
      {
        title: "Confirm diversification",
        status: "process",
        content: (
          <Table
            //bordered
            //rowSelection={deviceRowSelection}
            rowKey={record => record.id}
            size="small"
            dataSource={this.context.variants}
            columns={this.variantColumns}
            expandedRowRender={record => (
              <span>
                <Table
                  columns={this.nestedDeviceColumns}
                  dataSource={this.context.devices.slice(2, 4)} //TODO: ALARM!!!
                  pagination={false}
                />
              </span>
            )}
            pagination={{ pageSize: 50 }}
          />
        )
      }
    ];

    return (
      <div>
        <Row type="flex" justify="center" style={{ marginBottom: 20 }}>
          <Col span={22}>
            <Steps
              current={currentStep}
              type="navigation"
              onChange={currentStep === 0 ? this.next : this.prev}
            >
              {steps.map(item => (
                <Step key={item.title} title={item.title} />
              ))}
            </Steps>
          </Col>
        </Row>
        <Row type="flex" justify="center">
          <Col span={22}>
            <div>{steps[currentStep].content}</div>
          </Col>
        </Row>
      </div>
    );
  }

  componentDidMount() {
    //add if needed
  }
}

const MultipleDeploymentForm = Form.create({})(MultipleDeploymentArea);
export default MultipleDeploymentForm;
