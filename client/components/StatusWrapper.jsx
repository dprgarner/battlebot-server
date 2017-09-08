export default function StatusWrapper(BaseComponent) {
  function StatusWrapped(props) {
    if (props.data.loading) {
      // TODO spinner
      return (
        <span>
          Loading...
        </span>
      );
    }

    if (props.data.error) {
      return (
        <span>
          { props.data.error.message }
        </span>
      );
    }

    return <BaseComponent {...props} />
  }

  StatusWrapped.displayName = `StatusWrapped(${
    BaseComponent.displayName || BaseComponent.name    
  })`;

  return StatusWrapped;
}
