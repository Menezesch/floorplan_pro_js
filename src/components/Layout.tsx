import ToolbarLeft from './ToolbarLeft';
import PropertiesRight from './PropertiesRight';
import SvgViewport from '../canvas/SvgViewport';
import StatusBar from './StatusBar';

const Layout = () => (
  <div className="grid h-[calc(100%-60px)] grid-cols-[192px_1fr_256px] gap-3">
    <ToolbarLeft />
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <SvgViewport />
      </div>
      <StatusBar />
    </div>
    <PropertiesRight />
  </div>
);

export default Layout;
