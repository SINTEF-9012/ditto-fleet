import React, { Component } from "react";
import { Button, message, Table, Modal } from "antd";
import SMTForm from "./SMTForm";
import { DiversificationContext } from "./DiversificationContext";
import { GlobalContext } from "../GlobalContext";
import ReactJson from "react-json-view";

export class VariantStep extends Component {
  static contextType = DiversificationContext;

  constructor(props) {
    super(props);
    this.variant_columns = [
      {
        title: "Variant ID",
        dataIndex: "id",
      },
      {
        title: "Template",
        dataIndex: "template",
        render: (text, record) => (
          <Button type="link" onClick={() => this.context.handleTabChange("1")}>
            {record.template}
          </Button>
        ),
      },
      {
        title: "Deployment parameters",
        dataIndex: "params",
        render: (text, record) =>
          this.context.deployment_list.deployments[record.id] ? (
            <Button type="link" onClick={() => this.showParameters(record)}>
              View
            </Button>
          ) : (
            ""
          ),
      },
    ];
    this.state = {
      visible: false,
    };
  }

  handleVariantSelectChange = (value) => {
    console.log("Selected variants changed: ", value);
    this.context.setSelectedVariantRowKeys(value);
  };

  handleVariantSelect = (record, selected, selectedRows, nativeEvent) => {
    this.setState({
      visible: selected,
    });
    if (!selected) {
      var deployment_list = this.context.deployment_list;
      delete deployment_list.deployments[record.id];
      this.context.setDeploymentList(deployment_list);
    }
  };

  handleCancel = () => {
    const { form } = this.formRef.props;
    form.resetFields();
    this.setState({
      visible: false,
    });
    var selected_variant_rowkeys = this.context.selected_variant_rowkeys;
    selected_variant_rowkeys.pop();
    this.context.setSelectedVariantRowKeys(selected_variant_rowkeys);
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const { form } = this.formRef.props;
    form.validateFields((err, values) => {
      if (!err) {
        this.parseFormValues(values);
        form.resetFields();
        this.setState({
          visible: false,
        });
      } else {
        message.warning("Please specify the deployment parameters!");
      }
    });
  };

  parseFormValues = (values) => {
    var deployment_list = this.context.deployment_list;
    //var depl_id = "dp" + depl_list.length;
    var deployment_id = this.context.selected_variant_rowkeys.slice(-1)[0];
    deployment_list.deployments[deployment_id] = values;
    this.context.setDeploymentList(deployment_list);
  };

  handleReset = (e) => {
    this.setState({ vsn: null });
    this.setState({ vsn_toggle: false });
    this.setState({ compu_level: null });
    this.setState({ compu_level_toggle: false });
    this.setState({ comm_level: null });
    this.setState({ comm_level_toggle: false });
    this.setState({ dp_acc: null });
    this.setState({ dp_acc_toggle: false });
    this.setState({ intlmodule: null });
    this.setState({ intlmodule_toggle: false });

    this.props.form.resetFields();
    console.log("Form cleared!");
  };

  removeDisabledFields = (values) => {
    //TODO: add more fields if needed
    if (this.state.vsn_toggle) delete values.vsn;
    if (this.state.compu_level_toggle) delete values.compu_level;
    if (this.state.comm_level_toggle) delete values.comm_level;
    if (this.state.dp_acc_toggle) delete values.dp_acc;
    if (this.state.intlmodule_toggle) delete values.intlmodule;
    return values;
  };

  saveFormRef = (formRef) => {
    this.formRef = formRef;
  };

  showParameters = (record) => {
    Modal.info({
      title: "Deployment parameters for: " + record.id,
      content: (
        <ReactJson
          src={this.context.deployment_list.deployments[record.id]}
          theme="apathy:inverted"
        />
      ),
      onOk() {},
    });
  };

  render() {
    const variant_row_selection = {
      columnTitle: " ", //FIXME: this line is to hide the "Select all" checkbox
      selectedRowKeys: this.context.selected_variant_rowkeys,
      onChange: this.handleVariantSelectChange,
      onSelect: this.handleVariantSelect,
      //type: "radio"
    };

    const formItemLayout = {
      labelCol: { span: 8 },
      wrapperCol: { span: 16 },
    };

    const validateMessages = {
      required: "'${name}' is a required field!",
    };

    return (
      <GlobalContext.Consumer>
        {({ variants }) => (
          <div>
            <Table
              //bordered
              rowSelection={variant_row_selection}
              rowKey={(record) => record.id}
              size="small"
              dataSource={variants}
              columns={this.variant_columns}
              pagination={{ pageSize: 20 }}
              scroll={{ y: 400 }}
            />
            <SMTForm
              wrappedComponentRef={this.saveFormRef}
              visible={this.state.visible}
              onCancel={this.handleCancel}
              onOk={this.handleSubmit}
            />
          </div>
        )}
      </GlobalContext.Consumer>
    );
  }

  componentDidMount() {
    //TODO
  }
}
