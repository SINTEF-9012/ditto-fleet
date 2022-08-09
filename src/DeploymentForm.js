import React, { Component } from "react";
import {
  Form,
  Select,
  InputNumber,
  DatePicker,
  Switch,
  Slider,
  Button,
  Row,
  Col
} from "antd";
import { solve } from "./solvers/WeightedProductModelSolver";

const { Option } = Select;
const { RangePicker } = DatePicker;

class DeploymentForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      //add if needed
      environment: { weight: 5 },
      status: { weight: 5 },
      capability: { weight: 5 },
      lastactive: { weight: 5 },
      lastupdate: { weight: 5 },
      cpu: { weight: 5 },
      ram: { weight: 5 },
      storage: { weight: 5 },
      number: { weight: 5 },
      range: { weight: 5 },

      toggleEnvironment: false,
      toggleStatus: false,
      toggleCapability: false,
      toggleLastActive: false,
      toggleLastUpdate: false,
      toggleCpu: false,
      toggleRam: false,
      toggleStorage: false,
      toggleNumber: false,
      toggleRange: false,
      myValidateHelp: "",
      myValidateStatus: ""
    };
  }

  handleSubmit = e => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        console.log("Received form values: ", values);
        console.log("Devices: ", this.props.devices);
        solve(values, this.props.devices);
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;
    const { myValidateHelp, myValidateStatus } = this.state;
    const formItemLayout = {
      labelCol: { span: 8 },
      wrapperCol: { span: 12 }
    };
    const rangeConfig = {
      rules: [{ type: "array", message: "Please select time!" }]
    };

    return (
      <Form
        {...formItemLayout}
        // onSubmit={this.handleSubmit}
        style={{ backgroundColor: "#fff" }}
      >
        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleEnvironment: !this.state.toggleEnvironment
                  });
                }}
              />{" "}
              Target environment
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("environment.value", {
                rules: [
                  {
                    message:
                      "Please select target environment(s) for a deployment",
                    type: "array"
                  }
                ]
              })(
                <Select
                  mode="multiple"
                  placeholder="Please select target environment(s) for a deployment"
                  disabled={this.state.toggleEnvironment}
                >
                  <Option value="production">Production</Option>
                  <Option value="testing">Testing</Option>
                  <Option value="safe-mode">Safe mode</Option>
                </Select>
              )}
            </Col>
            <Col span={2}>
              {getFieldDecorator("environment.weight", {
                initialValue: this.state.environment.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleEnvironment}
                  onChange={value =>
                    this.setState({
                      environment: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleStatus: !this.state.toggleStatus
                  });
                }}
              />{" "}
              Target status
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("status.value", {
                rules: [
                  {
                    message: "Please select target status(es) for a deployment",
                    type: "array"
                  }
                ]
              })(
                <Select
                  mode="multiple"
                  placeholder="Please select target status(es) for a deployment"
                  disabled={this.state.toggleStatus}
                >
                  <Option value="running">Running</Option>
                  <Option value="failed">Failed</Option>
                  <Option value="suspended">Suspended</Option>
                </Select>
              )}
            </Col>
            <Col span={2}>
              {getFieldDecorator("status.weight", {
                initialValue: this.state.status.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleStatus}
                  onChange={value =>
                    this.setState({
                      status: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleCapability: !this.state.toggleCapability
                  });
                }}
              />{" "}
              Target capability
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("capability.value", {
                rules: [
                  {
                    message:
                      "Please select target device capability(ies) for a deployment",
                    type: "array"
                  }
                ]
              })(
                <Select
                  mode="multiple"
                  placeholder="Please select target device capability(ies) for a deployment"
                  disabled={this.state.toggleCapability}
                >
                  <Option value="sensehat">SenseHat</Option>
                </Select>
              )}
            </Col>
            <Col span={2}>
              {getFieldDecorator("capability.weight", {
                initialValue: this.state.capability.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleCapability}
                  onChange={value =>
                    this.setState({
                      capability: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleLastUpdate: !this.state.toggleLastUpdate
                  });
                }}
              />{" "}
              Last Update
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("lastupdate.value", {
                rules: [{ type: "array" }]
              })(
                <RangePicker
                  disabled={this.state.toggleLastUpdate}
                  onChange={value =>
                    this.setState({
                      lastupdate: { value: value }
                    })
                  }
                />
              )}
            </Col>
            <Col span={2}>
              {getFieldDecorator("lastupdate.weight", {
                initialValue: this.state.lastupdate.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleLastUpdate}
                  onChange={value =>
                    this.setState({
                      lastupdate: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleLastActive: !this.state.toggleLastActive
                  });
                }}
              />{" "}
              Last Active
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("lastactive.value")(
                <RangePicker
                  disabled={this.state.toggleLastActive}
                  onChange={value =>
                    this.setState({
                      lastactive: { value: value }
                    })
                  }
                />
              )}
            </Col>
            <Col span={2}>
              {getFieldDecorator("lastactive.weight", {
                initialValue: this.state.lastactive.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleLastActive}
                  onChange={value =>
                    this.setState({
                      lastactive: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleCpu: !this.state.toggleCpu
                  });
                }}
              />{" "}
              CPU
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("cpu.value", {
                initialValue: 10
              })(<Slider disabled={this.state.toggleCpu} />)}
            </Col>
            <Col span={2}>
              {getFieldDecorator("cpu.weight", {
                initialValue: this.state.cpu.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleCpu}
                  onChange={value =>
                    this.setState({
                      cpu: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleRam: !this.state.toggleRam
                  });
                }}
              />{" "}
              RAM
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("ram.value", {
                initialValue: 20
              })(<Slider disabled={this.state.toggleRam} />)}
            </Col>
            <Col span={2}>
              {getFieldDecorator("ram.weight", {
                initialValue: this.state.ram.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleRam}
                  onChange={value =>
                    this.setState({
                      ram: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleStorage: !this.state.toggleStorage
                  });
                }}
              />{" "}
              Storage
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("storage.value", {
                initialValue: 30
              })(<Slider disabled={this.state.toggleStorage} />)}
            </Col>
            <Col span={2}>
              {getFieldDecorator("storage.weight", {
                initialValue: this.state.storage.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleStorage}
                  onChange={value =>
                    this.setState({
                      storage: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleNumber: !this.state.toggleNumber
                  });
                }}
              />{" "}
              Number of Devices
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("number.value", {
                initialValue: 10,
                rules: [
                  {
                    message: "Please select the number of target devices",
                    type: "number"
                  }
                ]
              })(
                <InputNumber
                  min={1}
                  max={100}
                  disabled={this.state.toggleNumber}
                />
              )}
            </Col>
            <Col span={2}>
              {getFieldDecorator("number.weight", {
                initialValue: this.state.number.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleNumber}
                  onChange={value =>
                    this.setState({
                      number: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        <Form.Item
          label={
            <span>
              <Switch
                defaultChecked
                size="small"
                onClick={() => {
                  this.setState({
                    toggleRange: !this.state.toggleRange
                  });
                }}
              />{" "}
              Deployment Range
            </span>
          }
          help={myValidateHelp}
          validateStatus={myValidateStatus}
        >
          <Row gutter={8}>
            <Col span={21}>
              {getFieldDecorator("range.value")(
                <Slider
                  marks={{
                    0: "0 km",
                    10: "10 km",
                    20: "20 km",
                    30: "30 km",
                    40: "40 km",
                    50: "50 km",
                    60: "60 km",
                    70: "70 km",
                    80: "80 km",
                    90: "90  km",
                    100: "100 km"
                  }}
                  disabled={this.state.toggleRange}
                  onChange={value =>
                    this.setState({
                      range: { value: value }
                    })
                  }
                />
              )}
            </Col>
            <Col span={2}>
              {getFieldDecorator("range.weight", {
                initialValue: this.state.range.weight,
                rules: [
                  {
                    type: "number"
                  }
                ]
              })(
                <Slider
                  min={1}
                  max={10}
                  disabled={this.state.toggleRange}
                  onChange={value =>
                    this.setState({
                      range: { weight: value }
                    })
                  }
                />
              )}
            </Col>
          </Row>
        </Form.Item>

        {/* <Form.Item wrapperCol={{ span: 10, offset: 8 }}>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Form.Item> */}
      </Form>
    );
  }
}

export default Form.create()(DeploymentForm);
