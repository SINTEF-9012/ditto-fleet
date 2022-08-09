import React, { Component } from "react";
import {
  Button,
  Layout,
  Col,
  Row,
  Menu,
  Table,
  Popconfirm,
  Tooltip,
  Dropdown,
  Modal,
  List
} from "antd";
import axios from "axios";
import { JsonEditor as Editor } from "jsoneditor-react";
import "jsoneditor-react/es/editor.min.css";
import { GlobalContext } from "./GlobalContext";
const traverse = require("traverse")

const { Content } = Layout;
const ButtonGroup = Button.Group;

export class VariantArea2 extends Component {
  static contextType = GlobalContext;

  constructor(props) {
    super(props);
    this.columns = [
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
      },
      {
        title: "Actions",
        width: 180,
        align: "center",
        render: (text, record) => (
          <span style={{ float: "right" }}>
            <ButtonGroup size="small" type="dashed">
              <Dropdown
                overlay={
                  <Menu>
                    <Menu.Item key="0">
                      <Button
                        type="link"
                        onClick={event =>
                          this.deployVariant(record, "production")
                        }
                      >
                        Production
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="1">
                      <Button
                        type="link"
                        onClick={event => this.deployVariant(record, "preview")}
                      >
                        Preview
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="3">
                      <Button
                        type="link"
                        onClick={event => this.deployVariant(record, "testing")}
                      >
                        Testing
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="4">
                      <Button
                        type="link"
                        onClick={event =>
                          this.deployVariant(record, "safe-mode")
                        }
                      >
                        Safe mode
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="5">
                      <Button
                        type="link"
                        onClick={event=>this.deployVarientToDevice(record)}
                      >
                        To Device
                      </Button>
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item key="6">
                      <Button
                        type="link"
                        onClick={event=>this.deployVarientGeneric(record)}
                      >
                        Generic
                      </Button>
                    </Menu.Item>
                  </Menu>
                }
              >
                <Tooltip title="Deploy to ...">
                  <Button type="primary" icon="rocket" ghost />
                </Tooltip>
              </Dropdown>
              <Tooltip title="View & Edit">
                <Button
                  type="primary"
                  icon="edit"
                  onClick={() => this.editVariant(record)}
                  ghost
                />
              </Tooltip>
              <Tooltip title="Copy">
                <Button
                  type="primary"
                  icon="copy"
                  onClick={() => this.copyVariant(record)}
                  ghost
                />
              </Tooltip>
              <Tooltip title="Save">
                <Button
                  type="primary"
                  icon="save"
                  onClick={() => {
                    this.saveVariant();
                  }}
                  ghost
                />
              </Tooltip>
              <Tooltip title="Delete">
                <Popconfirm
                  title="Sure to delete?"
                  onConfirm={() => this.deleteVariant(record.id)}
                >
                  <Button type="primary" icon="delete" ghost />
                </Popconfirm>
              </Tooltip>
            </ButtonGroup>
          </span>
        )
      }
    ];
    this.modal_columns = [
      {
        title: "id",
        dataIndex: "name",
      },
      {
        title: "description",
        render: (text, record) => <span>{record.app}</span>
      }
    ];
    this.state = {
      //variants: [],
      forEdit: null,
      edited: null,
      showModal: false,
      genesis_models: [],
      attach_url: ''
    };
    this.editor = React.createRef();
  }

  render() {
    const { forEdit, attach_url } = this.state;
    const rowSelection = {
      type: "radio", 
      onChange: this.handleSelectChange
    }
    return (
      <Layout>
        <Content>
          <Row>
            <Col span={12}>
              <Table
                //bordered
                rowKey={record => record.id}
                size="small"
                dataSource={this.context.variants}
                columns={this.columns}
                pagination={{ pageSize: 50 }}
                scroll={{ y: 400 }}
              />
            </Col>
            <Col span={12}>
              <Editor
                history="true"
                value={forEdit}
                ref={this.editor}
                onChange={this.handleChange}
              />
              <Modal
                title="Select the artefact"
                visible={this.state.showModal}
                onOk={this.handleOk}
                onCancel={this.handleCancel}
              >
              <Table
                rowKey={record => record.id}
                size="small"
                dataSource={this.state.genesis_models}
                columns={this.modal_columns}
                rowSelection={rowSelection}
              />
              <span>{attach_url}</span>
              </Modal>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }

  handleCancel = e => {
    console.log(e);
    this.setState({
      showModal: false,
    });
  };

  handleOk = e => {
    this.setState({
      showModal: false
    })
    const {attach_url} = this.state
    let orig_edited = this.state.edited
    let edited = traverse(orig_edited).map(function (x) {
      if(x == "<...>"){
        if(attach_url.startsWith("http")){
          this.update(attach_url)
        }
        else
          this.update("PlaceHolder", true)
      }
    })
    this.setState(
      {edited: edited, forEdit: edited}, 
      () => {this.editor.current.componentDidMount()}
    );
  };

  handleExpandRow = (expanded, record) => {
    const expandedRows = [];
    if (expanded) {
      expandedRows.push(record.id);
    }
    this.setState({ expandedRows });
    //this.editVariant(record)
  };

  handleSelectChange = (selectedRowKeys, selectedRows) => {
    this.state.genesis_models.filter(obj => obj.name == selectedRowKeys[0])
    this.setState({attach_url: selectedRows[0].attach_url})
  };

  componentDidMount() {
    this.getVariants().then(result => {
      this.setState({ variants: result });
    });
  }

  handleChange = value => {
    let found = false
    traverse(value).map(x => {
      if (x == '<...>'){
        found = true
      }
    })
    if(found){
      try{
      this.getGenesisModels().then(result =>{
        this.setState({genesis_models: result})
      })
      }
      catch(e){
        console.log(e)
      }
    }
    this.setState({ edited: value, showModal: found });
  };

  getGenesisModels = async() =>{
    let result = (await axios.get('api/hub/query/type/genesis.deployment')).data;
    if("NoAccess" in result){
      let address = prompt("Please provide a new host to the hub", result['NoAccess'])
      result = (await axios.get(
        'api/hub/query/type/genesis.deployment', 
        {headers:{HubHost: address}}
      )).data
      if("NoAccess" in result){
        result = []
      }
    }
    return result 
  }

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
      await axios.put(`api/variant/${edited.id}`, edited);
      this.componentDidMount();
    } else {
      window.confirm("No change to save");
    }
  };

  copyVariant = async record => {
    const id = prompt("Enter new ID");

    if (!id) return;
    let newVariant = { ...record, id: id };
    delete newVariant._id;
    this.context.addVariant(newVariant);
    this.setState({
      //variants: [...this.state.variants, newVariant],
      edited: newVariant,
      foredit: newVariant
    });
  };

  /**
   * Create a deployment based on a template variant and an environment
   */
  deployVariant = async (variant, environment) => {
    console.log("Deploying variant: " + variant.id + " into " + environment);
    axios.put("/api/global/deploy/" + variant.id + "/" + environment);
  };

  deployVarientToDevice = async (variant) => {
    const device = prompt("Enter Device ID");
    axios.put(`/api/global/specific/${variant.id}/${device}`)
  }

  deployVarientGeneric = async (variant) => {
    const priority = prompt("Enter Priority", "1");
    axios.put(`/api/global/generic/${variant.id}/${priority}`)
  }
}
