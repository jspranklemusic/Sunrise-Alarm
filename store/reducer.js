const initialState = {
    item:"peach"
}

function reducer(state=initialState, action) {
    switch(action.type){
        case "FetchCoords":
            console.log("updated via redux!")
            return state
    }
    return state
  }

export default reducer