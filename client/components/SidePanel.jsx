import styled from 'styled-components';

import BotList from 'client/components/BotList';

const HeaderText = styled.h3`
  margin: 0;
  font-size: 20px;
`;

export default function SidePanel() {
  return (
    <div>
      <HeaderText>Noughts and Crosses bots:</HeaderText>
      <BotList />    
    </div>
  );
}
