import styled from 'styled-components';

import TopNav from 'client/components/TopNav';
import SidePanel from 'client/components/SidePanel';
import MainPanel from 'client/components/MainPanel';

const Body = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: Arial;
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: scroll;
  width: 100%;
`;

const SideMainContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
`;

const SidePanelContainer = styled.aside`
  padding: 10px;
  border-left: ${props => props.theme.border};
  border-right: ${props => props.theme.border};
  background-color: ${props => props.theme.background};
`;

export default function Page() {
  return (
    <Body>
      <TopNav />
      <SideMainContainer>
        <SidePanelContainer>
          <SidePanel />
        </SidePanelContainer>
        <MainContainer>
          <MainPanel />
        </MainContainer>
      </SideMainContainer>
    </Body>
  );
}
