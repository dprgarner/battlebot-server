import styled from 'styled-components';

import TopNav from 'client/components/TopNav';
import SidePanel from 'client/components/SidePanel';
import Main from 'client/components/Main';

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
  border-left: 1px solid #888;
  border-right: 1px solid #888;
  background-color: #e0e0e0;
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
          <Main />
        </MainContainer>
      </SideMainContainer>
    </Body>
  );
}
