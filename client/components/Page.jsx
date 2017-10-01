import styled from 'styled-components';

import TopNav from 'client/components/TopNav';
import SidePanel from 'client/components/SidePanel';
import MainBody from 'client/components/MainBody';

const Body = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: Arial;
`;

let MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  margin-left: 222px;
`;

const SideMainContainer = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  margin-top: 40px;
`;

const SidePanelContainer = styled.aside`
  background-color: ${props => props.theme.background};
  border-left: ${props => props.theme.border};
  border-right: ${props => props.theme.border};
  height: 100%;
  padding: 10px;
  position: fixed;
  width: 200px;
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
          <MainBody />
        </MainContainer>
      </SideMainContainer>
    </Body>
  );
}
