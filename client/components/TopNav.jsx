import styled from 'styled-components';

const NavContainer = styled.nav`
  display: block;
  background-color: #e0e0e0;
  border: 1px solid #888;
`;

const HorizUl = styled.ul`
  margin: 0;
  padding: 0;
`;

const HorizLi = styled.li`
  border-right: 1px solid #888;
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
