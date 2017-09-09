import ArticleBox from 'client/components/ArticleBox';

var l= [];
for (let i = 0; i < 5; i++) {
  l.push(i);
}

export default function Main() {
  return (
    <div>
      {
        l.map(() => (
          <ArticleBox>
            <a href="https://github.com/dprgarner/battlebot-server">
              { 'Github page for the Battlebot Server' }
            </a>
          </ArticleBox>
        ))
      }
    </div>
  );
}
