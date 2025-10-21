import React from 'react'
import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

const Loading: React.FC = () => {
  return (
    <div className="loading-container">
      <Spin 
        indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
        size="large"
      />
    </div>
  )
}

export default Loading
