import _ from 'underscore';
import styled from 'styled-components';

const ContainerUnadjusted = styled.ul`
  margin: 0 15px 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`;

export const Item = styled.li`
  list-style-type: none;
  display: inline-block;
  min-width: 200px;
  flex: 1 0 auto;
  opacity: ${props => props.hide ? 0 : 1};
`;

export function Container({ children, empties=6 }) {
  return (
    <ContainerUnadjusted>
      { children }
      { _.range(empties).map(i => (
        <Item hide key={i}/>
      )) }
    </ContainerUnadjusted>
  );
}
