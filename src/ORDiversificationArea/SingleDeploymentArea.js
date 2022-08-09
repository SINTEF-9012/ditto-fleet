import React, { Component } from "react";
//import axios from "axios";
import MainForm from "./MainForm";
import { Badge, Tag, Form, Button } from "antd";
import { solve } from "../solvers/WeightedProductModelSolver";
import { GlobalContext } from "../GlobalContext";

const colors = ["blue", "red", "green"];

class SingleDeploymentArea extends Component {
  static contextType = GlobalContext;

  constructor(props) {
    super(props);
    this.variantColumns = [
      {
        title: "Variant ID",
        dataIndex: "id"
      },
      {
        title: "Template",
        dataIndex: "template",
        render: (text, record) => (
          <Button type="link" onClick={() => this.context.handleTabChange("1")}>
            {record.template}
          </Button>
        )
      }
    ];
    this.deviceColumns = [
      {
        title: "Device ID",
        dataIndex: "id",
        width: 200,
        render: (text, record) =>
          this.props.deviceTags[record.id].status === "failed" ? (
            <span>
              <Badge status="error" />
              {record.id}
            </span>
          ) : (
            <span>
              <Badge status="success" />
              {record.id}
            </span>
          )
      },
      {
        title: "Tags",
        dataIndex: "tags",
        render: (text, record) =>
          this.props.deviceTags[record.id] &&
          Object.keys(this.props.deviceTags[record.id]).map((key, i) => (
            <Tag color={colors[i]}>
              {key}: {this.props.deviceTags[record.id][key]}
            </Tag>
          )),
        width: 600
      }
    ];
    this.state = {
      //add if needed
      matchingDevices: [],
      devices: this.props.devices,
      variants: this.props.variants
      //currentStep: 0,
      //selectedVariantRowKeys: []
    };
  }

  next = () => {
    if (this.state.currentStep === 1) {
      this.props.form.validateFields((err, values) => {
        if (!err) {
          console.log("Received form values: ", values);
          console.log("Devices: ", this.props.devices);
          let matchingDevices = solve(values, this.props.devices);
          console.log("Matching devices: ", matchingDevices);
          this.setState({ matchingDevices: matchingDevices });
          console.log(this.state.matchingDevices);
        }
      });
    }

    const currentStep = this.state.currentStep + 1;
    this.setState({ currentStep });
  };

  prev = () => {
    const currentStep = this.state.currentStep - 1;
    this.setState({ currentStep });
  };

  onVariantSelectChange = selectedVariantRowKeys => {
    console.log("selectedVariantRowKeys changed: ", selectedVariantRowKeys);
    this.setState({ selectedVariantRowKeys });
  };

  render() {
    return (
      <MainForm
        variants={this.props.variants}
        devices={this.props.devices}
        tags={this.props.deviceTags}
        form={this.props.form}
        deployments={this.props.deployments}
        activeDeployments={this.props.activeDeployments}
        appliedDevices={this.props.appliedDevices}
        deviceTags={this.props.deviceTags}
        callbackTabChange={this.context.handleTabChange}
      />
    );
  }

  componentDidMount() {
    //add if needed
  }
}

const SingleDeploymentForm = Form.create({})(SingleDeploymentArea);
export default SingleDeploymentForm;
