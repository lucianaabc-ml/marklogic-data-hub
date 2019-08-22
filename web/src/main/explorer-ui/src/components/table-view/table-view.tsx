import React, { useState } from 'react';
import { Table } from 'antd';

const TableView = (props) => {

  let data = new Array();

  Object.keys(props.document.envelope.attachments.envelope.instance).forEach(function (key) {
    data.push({ property: key, value: props.document.envelope.attachments.envelope.instance[key] });
  });

  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    expanded === false ? setExpanded(true) : setExpanded(false)
  }

  const columns = [
    {
      title: 'Property',
      dataIndex: 'property',
      width: '20%',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      render: (value: string) => {
        const pStyle = {
          whiteSpace: !expanded ? "nowrap" : "normal",
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          maxWidth: '150ex',
          cursor: 'pointer',
          padding: '0',
          margin: '0'
        } as React.CSSProperties
        return <p onClick={() => handleClick()} style={pStyle}>{value}</p>
      },
      width: '80%',
    }
  ];

  return (
    <Table
      className="document-table-demo"
      rowKey="property"
      dataSource={data}
      columns={columns}
      pagination={false}
    />
  );
}

export default TableView;