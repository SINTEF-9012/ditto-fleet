import React, { Component } from "react";
import { Form, Select, Switch, Row, Col, Button, Modal } from "antd";

const { Option } = Select;

class SMTForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      //formValues: {
      vsn: null,
      vsn_toggle: false,

      compu_level: null,
      compu_level_toggle: false,

      comm_level: null,
      comm_level_toggle: false,

      dp_acc: null,
      dp_acc_toggle: false,

      intlmodule: null,
      intlmodule_toggle: false,

      //validation messages
      myValidateHelp: "",
      myValidateStatus: "",
    };
  }

  // handleSubmit = e => {
  //   e.preventDefault();
  //   //TODO deploy selected variant to selected devices
  //   this.props.form.validateFields((err, values) => {
  //     if (!err) {
  //       values = this.removeDisabledFields(values);
  //       console.log("Form submited", values);
  //       //TODO return values to the parent
  //     } else {
  //       message.warning("Please specify the deployment parameters!");
  //     }
  //   });
  // };

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
    //add more fields if needed
    if (this.state.vsn_toggle) delete values.vsn;
    if (this.state.compu_level_toggle) delete values.compu_level;
    if (this.state.comm_level_toggle) delete values.comm_level;
    if (this.state.dp_acc_toggle) delete values.dp_acc;
    if (this.state.intlmodule_toggle) delete values.intlmodule;
    return values;
  };

  render() {
    const { visible, onCancel, onOk } = this.props;
    const { getFieldDecorator } = this.props.form;
    const formItemLayout = {
      labelCol: { span: 8 },
      wrapperCol: { span: 16 },
    };

    return (
      <Modal
        visible={visible}
        title={
          <div>
            Specify deployment parameters{" "}
            <Button type="link" onClick={this.handleReset}>
              Reset
            </Button>
          </div>
        }
        okText="OK"
        onCancel={onCancel}
        onOk={onOk}
        width={650}
      >
        <Form
          {...formItemLayout}
          //validateMessages={validateMessages}
          //onSubmit={this.handleSubmit}
        >
          {/* <Form.Item label="Deployment ID">
            <Row>
              <Col>
                {getFieldDecorator("depl_id", {
                  initialValue: this.state.depl_id,
                  rules: [
                    {
                      required: true,
                      type: "string"
                    }
                  ]
                })(<Input placeholder="Deployment ID" />)}
              </Col>
            </Row>
          </Form.Item> */}

          <Form.Item
            label={
              <span>
                <Switch
                  defaultChecked
                  //checked={!this.state.vsn_toggle}
                  size="small"
                  onClick={() => {
                    this.setState({
                      vsn_toggle: !this.state.vsn_toggle,
                    });
                  }}
                />{" "}
                Version
              </span>
            }
          >
            <Row>
              <Col>
                {getFieldDecorator("vsn", {
                  hidden: this.state.vsn_toggle,
                  //initialValue: this.state.vsn,
                  rules: [
                    {
                      required: true,
                      type: "string",
                    },
                  ],
                })(
                  <Select
                    mode="single"
                    placeholder="Please select version"
                    disabled={this.state.vsn_toggle}
                    onChange={(value) => this.setState({ vsn: value })}
                  >
                    <Option value="release">Release</Option>
                    <Option value="development">Development</Option>
                    <Option value="preview">Preview</Option>
                  </Select>
                )}
              </Col>
            </Row>
          </Form.Item>
          <Form.Item
            label={
              <span>
                <Switch
                  defaultChecked
                  //checked={!this.state.compu_level_toggle}
                  size="small"
                  onClick={() => {
                    this.setState({
                      compu_level_toggle: !this.state.compu_level_toggle,
                    });
                  }}
                />{" "}
                Computation level
              </span>
            }
          >
            <Row>
              <Col>
                {getFieldDecorator("compu_level", {
                  hidden: this.state.compu_level_toggle,
                  //initialValue: this.state.compu_level,
                  rules: [
                    {
                      required: true,
                      type: "integer",
                    },
                  ],
                })(
                  <Select
                    mode="single"
                    placeholder="Please select computation level"
                    disabled={this.state.compu_level_toggle}
                    onChange={(value) => this.setState({ compu_level: value })}
                  >
                    <Option value={1}>1</Option>
                    <Option value={2}>2</Option>
                    <Option value={3}>3</Option>
                  </Select>
                )}
              </Col>
            </Row>
          </Form.Item>
          <Form.Item
            label={
              <span>
                <Switch
                  defaultChecked
                  //checked={!this.state.comm_level_toggle}
                  size="small"
                  onClick={() => {
                    this.setState({
                      comm_level_toggle: !this.state.comm_level_toggle,
                    });
                  }}
                />{" "}
                Communication level
              </span>
            }
          >
            <Row>
              <Col>
                {getFieldDecorator("comm_level", {
                  hidden: this.state.comm_level_toggle,
                  //initialValue: this.state.comm_level,
                  rules: [
                    {
                      required: true,
                      type: "integer",
                    },
                  ],
                })(
                  <Select
                    mode="single"
                    placeholder="Please select communication level"
                    disabled={this.state.comm_level_toggle}
                    onChange={(value) => this.setState({ comm_level: value })}
                  >
                    <Option value={1}>1</Option>
                    <Option value={2}>2</Option>
                    <Option value={3}>3</Option>
                  </Select>
                )}
              </Col>
            </Row>
          </Form.Item>
          <Form.Item
            label={
              <span>
                <Switch
                  defaultChecked
                  //checked={!this.state.dp_acc_toggle}
                  size="small"
                  onClick={() => {
                    this.setState({
                      dp_acc_toggle: !this.state.dp_acc_toggle,
                    });
                  }}
                />{" "}
                Hardware acceleration
              </span>
            }
          >
            <Row>
              <Col>
                {getFieldDecorator("dp_acc", {
                  hidden: this.state.dp_acc_toggle,
                  //initialValue: this.state.dp_acc,
                  rules: [
                    {
                      required: true,
                      type: "string",
                    },
                  ],
                })(
                  <Select
                    mode="single"
                    placeholder="Please select hardware acceleration"
                    disabled={this.state.dp_acc_toggle}
                    onChange={(value) => this.setState({ dp_acc: value })}
                  >
                    <Option value="acc_none">None</Option>
                    <Option value="tpu">TPU</Option>
                  </Select>
                )}
              </Col>
            </Row>
          </Form.Item>
          <Form.Item
            label={
              <span>
                <Switch
                  defaultChecked
                  //checked={!this.state.intlmodule_toggle}
                  size="small"
                  onClick={() => {
                    this.setState({
                      intlmodule_toggle: !this.state.intlmodule_toggle,
                    });
                  }}
                />{" "}
                Intelligence module
              </span>
            }
          >
            <Row>
              <Col>
                {getFieldDecorator("intlmodule", {
                  hidden: this.state.intlmodule_toggle,
                  //initialValue: this.state.intlmodule,
                  rules: [
                    {
                      required: true,
                      type: "string",
                    },
                  ],
                })(
                  <Select
                    mode="single"
                    placeholder="Please select intelligence module"
                    disabled={this.state.intlmodule_toggle}
                    onChange={(value) => this.setState({ intlmodule: value })}
                  >
                    <Option value="edge">Edge</Option>
                    <Option value="cloud">Cloud</Option>
                    <Option value="flexible">Flexible</Option>
                  </Select>
                )}
              </Col>
            </Row>
          </Form.Item>
          {/* <Row>
            <Col span={24} style={{ textAlign: "right" }}>
              <Button type="primary" htmlType="submit">
                Submit
              </Button>
              <Button style={{ marginLeft: 8 }} onClick={this.handleReset}>
                Clear
              </Button>
            </Col>
          </Row> */}
        </Form>
      </Modal>
    );
  }

  componentDidMount() {
    //add if needed
  }
}

export default Form.create({
  name: "smt_form",
  //validateMEssages: { required: "'${name}' is a required field!" },
})(SMTForm);
