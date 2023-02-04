import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Reddit from './Reddit';
import Danbooru from './Danbooru';
import Twitter from './Twitter';
import Pixiv from './Pixiv';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`}>
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function BasicTabs() {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Reddit" {...a11yProps(0)} />
          <Tab label="Twitter" {...a11yProps(1)} />
          <Tab label="Danbooru" {...a11yProps(2)} />
          <Tab label="Pixiv" {...a11yProps(3)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <Reddit />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Twitter/>
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Danbooru/>
      </TabPanel>
      <TabPanel value={value} index={3}>
        <Pixiv/>
      </TabPanel>
    </Box>
  );
}
