import React, { Component } from "react";
import { Button, Col, Row, Table, Popconfirm } from "antd";
import axios from "axios";
import { JsonEditor as Editor } from "jsoneditor-react";
import "jsoneditor-react/es/editor.min.css";

export var TemplateContentAreaEnum = {
  TEMPLATE: 1,
  VARIANT: 2,
  PREVIEW: 3,
  DEFAULT: 4,
  properties: {
    1: { name: "template", value: 1, code: "T" },
    2: { name: "variant", value: 2, code: "V" },
    3: { name: "preview", value: 2, code: "R" },
    4: { name: "default", value: 4, code: "F" }
  }
};

export class TemplateArea extends Component {
  constructor(props) {
    super(props);
    this.columns = [
      {
        title: "ID",
        dataIndex: "id"
      },
      {
        title: "",
        render: (text, record) => (
          <div>
            <a onClick={() => this.editTemplate(record)}>edit </a>
            <a onClick={() => this.copyTemplate(record)}>copy </a>
            <Popconfirm
              title="Sure to delete?"
              onConfirm={() => this.deleteTemplate(record.id)}
            >
              <a>delete</a>
            </Popconfirm>
          </div>
        )
      }
    ];
    this.state = {
      templates: [],
      forEdit: null,
      edited: null
    };
    this.editor = React.createRef();
  }

  componentDidMount() {
    this.getTemplates().then(result => {
      this.setState({ templates: result });
    });
  }

  handleChange = value => {
    this.setState({ edited: value });
  };

  getTemplates = async () => {
    return (await axios.get("api/template/")).data;
  };

  saveTemplate = async () => {
    const { edited } = this.state;
    if (edited) {
      let result = await axios.put(`api/template/${edited.id}`, edited);
      this.componentDidMount();
    } else {
      window.confirm("No change to save");
    }
  };

  editTemplate = record => {
    this.setState({ forEdit: record }, () => {
      this.editor.current.componentDidMount();
    });
  };

  copyTemplate = async record => {
    const id = prompt("Enter new id");

    if (!id) return;
    let newTemplate = { ...record, id: id };
    delete newTemplate._id;
    this.setState({
      templates: [...this.state.templates, newTemplate],
      edited: newTemplate,
      foredit: newTemplate
    });
  };

  deleteTemplate = templateid => {
    axios.delete(`api/template/${templateid}`);
  };

  render() {
    const { templates, forEdit } = this.state;
    return (
      <div>
        <Row>
          <Col span={12}>
            <Table
              bordered
              size="small"
              dataSource={templates}
              columns={this.columns}
            />
          </Col>
          <Col span={12}>
            {forEdit != null && (
              <div>
                <Button
                  onClick={() => {
                    this.saveTemplate();
                  }}
                >
                  Save
                </Button>
                <br />
                <Editor
                  value={forEdit}
                  ref={this.editor}
                  onChange={this.handleChange}
                />
              </div>
            )}
          </Col>
        </Row>
      </div>
    );
  }
}

export class VariantArea extends Component {
  constructor(props) {
    super(props);
    this.columns = [
      {
        title: "ID",
        dataIndex: "id"
      },
      {
        title: "Template",
        dataIndex: "template"
      },
      {
        title: "Actions",
        render: (text, record) => (
          <div>
            <a onClick={() => this.editVariant(record)}>edit </a>
            <a>copy </a>
            <Popconfirm
              title="Sure to delete?"
              onConfirm={() => this.deleteVariant(record.id)}
            >
              <a>delete</a>
            </Popconfirm>
          </div>
        )
      }
    ];
    this.state = {
      variants: [],
      forEdit: null,
      edited: null
    };
    this.editor = React.createRef();
  }

  componentDidMount() {
    this.getVariants().then(result => {
      this.setState({ variants: result });
    });
  }

  handleChange = value => {
    this.setState({ edited: value });
  };

  getVariants = async () => {
    return (await axios.get("api/variant/")).data;
  };

  editVariant = record => {
    this.setState({ forEdit: record }, () => {
      this.editor.current.componentDidMount();
    });
  };

  deleteVariant = variantid => {
    axios.delete(`api/variant/${variantid}`);
  };

  saveVariant = async () => {
    const { edited } = this.state;
    if (edited) {
      let result = await axios.put(`api/variant/${edited.id}`, edited);
      this.componentDidMount();
    } else {
      window.confirm("No change to save");
    }
  };

  render() {
    const { variants, forEdit } = this.state;
    return (
      <div>
        <Row>
          <Col span={12}>
            <Table
              bordered
              size="small"
              dataSource={variants}
              columns={this.columns}
            />
          </Col>
          <Col span={12}>
            {forEdit != null && (
              <div>
                <Button
                  onClick={() => {
                    this.saveVariant();
                  }}
                >
                  Save
                </Button>
                <Editor
                  value={forEdit}
                  ref={this.editor}
                  onChange={this.handleChange}
                />
              </div>
            )}
          </Col>
        </Row>
      </div>
    );
  }
}
