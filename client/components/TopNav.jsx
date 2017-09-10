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
        <HorizLi>
          <a href="https://github.com/dprgarner/battlebot-server">
            { 'Source code (Github)' }
          </a>
        </HorizLi>
        <HorizLi>
          <a href="https://travis-ci.org/dprgarner/battlebot-server">
            { 'Travis' }
          </a>
        </HorizLi>
      </HorizUl>
    </NavContainer>
  );
}
