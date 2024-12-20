import React from "react";
import ReactDOM from "react-dom";
import "antd/dist/antd.css";
import "./index.css";
import { Form, Input, Icon, Button } from "antd";

let id = 0;

class CreateAssignmentForm extends React.Component {
  remove = (k) => {
    const { form } = this.props;
    // can use data-binding to get
    const keys = form.getFieldValue("keys");
    // We need at least one passenger
    if (keys.length === 1) {
      return;
    }

    // can use data-binding to set
    form.setFieldsValue({
      keys: keys.filter((key) => key !== k),
    });
  };

  add = () => {
    const { form } = this.props;
    // can use data-binding to get
    const keys = form.getFieldValue("keys");
    const nextKeys = keys.concat(id++);
    // can use data-binding to set
    // important! notify form to detect changes
    form.setFieldsValue({
      keys: nextKeys,
    });
  };

  //handleSubmit = (e) => {
  //  e.preventDefault();
  //  this.props.form.validateFields((err, values) => {
  //    if (!err) {
  //      const { keys, expressions } = values;
  //      console.log("Received values of form: ", values);
  //      console.log(
  //        "Merged values:",
  //        keys.map((key) => expressions[key])
  //      );
  //    }
  //  });
  //};

  render() {
    const { getFieldDecorator, getFieldValue } = this.props.form;
    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 4 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 20 },
      },
    };
    const formItemLayoutWithOutLabel = {
      wrapperCol: {
        xs: { span: 24, offset: 0 },
        sm: { span: 20, offset: 4 },
      },
    };
    getFieldDecorator("keys", { initialValue: [] });
    const keys = getFieldValue("keys");
    const formItems = keys.map((k, index) => (
      <Form.Item
        {...(index === 0 ? formItemLayout : formItemLayoutWithOutLabel)}
        label={index === 0 ? "Target conditions" : ""}
        required={false}
        key={k}
      >
        {getFieldDecorator(`expressions[${k}]`, {
          validateTrigger: ["onChange", "onBlur"],
          rules: [
            {
              required: true,
              whitespace: true,
              message:
                "Please define a target condition in Resource Query Language (RQL) sysntax or delete this field.",
            },
          ],
        })(
          <Input
            placeholder="RQL expression"
            style={{ width: "60%", marginRight: 8 }}
          />
        )}
        {keys.length > 1 ? (
          <Icon
            className="dynamic-delete-button"
            type="minus-circle-o"
            onClick={() => this.remove(k)}
          />
        ) : null}
      </Form.Item>
    ));
    return (
      <Form
      //onSubmit={this.handleSubmit}
      >
        {formItems}
        <Form.Item {...formItemLayoutWithOutLabel}>
          <Button type="dashed" onClick={this.add} style={{ width: "60%" }}>
            <Icon type="plus" /> Add field
          </Button>
        </Form.Item>
        {/* <Form.Item {...formItemLayoutWithOutLabel}>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Form.Item> */}
      </Form>
    );
  }
}

//CreateAssignmentForm.propTypes = propTypes;
export default Form.create({
  //name: "global_state",
  //onFieldsChange(props, changedFields) {
  //  props.onChange(changedFields);
  //},
  //mapPropsToFields(props) {
  //  return {
  //    rql: Form.createFormField({
  //      ...props.rql,
  //      value: props.rql.value,
  //    }),
  //  };
  //},
  //onValuesChange(_, values) {
  //  console.log(JSON.stringify(values));
  //},
})(CreateAssignmentForm);
