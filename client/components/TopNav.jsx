import styled from 'styled-components';

const NavContainer = styled.nav`
  display: block;
  background-color: ${props => props.theme.background};
  border: ${props => props.theme.border};
`;

const HorizUl = styled.ul`
  margin: 0;
  padding: 0;
`;

const HorizLi = styled.li`
  border-right: ${props => props.theme.border};
  display: inline-block;
  padding: 10px;
`;

export default function TopNav(props) {
  return (
    <NavContainer>
      <HorizUl>
        <HorizLi>Aaaaaaa</HorizLi>
        <HorizLi>Bbbbbb</HorizLi>
        <HorizLi>Cccccc</HorizLi>
      </HorizUl>
    </NavContainer>
  );
}
