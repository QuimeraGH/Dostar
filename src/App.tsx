import { useEffect, useState } from "react";
import "./App.css";
import { defaultOff, skullIcon, spaceBackground } from "./assets/images";
import { appWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api";

interface Task {
  id: number,
  description: string,
  date: string,
  completed: boolean
}

function App() {

  const [tasks, setTasks] = useState<Task[]>([])
  const [todoDescription, setTodoDescription] = useState<string>("")
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const updateFilter = (newFilter: string) => {
    setFilter(newFilter.trim());
  };  

  const getTasksCall = async () => {
    try {
      const fetchedTasks = (await invoke("get_tasks_call")) as Task[];
      if (fetchedTasks.length === 0) {
        console.log("Nothing to fetch!");
        return;
      }
      setTasks(fetchedTasks);
      setFilteredTasks(fetchedTasks);
    } catch (e) {
      console.error("Error fetching todos!: ", e);
    }
  };

  useEffect(() => {
    getTasksCall()
  }, [])

  useEffect(() => {
    let filtered = [...tasks];
    switch (filter) {
      case "all":
        setFilteredTasks(filtered);
        break;
      case "done":
        setFilteredTasks(filtered.filter((task) => task.completed));
        break;
      case "undone":
        setFilteredTasks(filtered.filter((task) => !task.completed));
        break;
    }
  }, [tasks, filter]);

  useEffect(() => {

    const filters = document.getElementsByClassName("filter-button")
    const table = document.getElementById("table")
    const swapdiv = document.getElementById("emptydiv")

    if (table && filters && swapdiv) {
      if (tasks.length == 0) {
        table.style.display = "none"
        Array.prototype.forEach.call(filters, (el) => {
          el.style.display = "none"
        } )
        swapdiv.style.display = "flex"
      } else {
        table.style.display = "block"
        Array.prototype.forEach.call(filters, (el) => {
          el.style.display = "block"
        } )
        swapdiv.style.display = "none"
      }
    }

  }, [tasks])

  // Function calls

  const addTaskCall = async () => {

    if (todoDescription.trim() === "") return;

    const id = parseInt(Date.now().toString().trim())
    const description = todoDescription
    const date = new Date().toLocaleDateString()
    const completed = false

    const new_task: Task = {
      id: id,
      description: description,
      date: date,
      completed: completed
    }

    addTask(new_task);

    await invoke("add_task_call", { new_task })
    .then((succes) => console.log("Operation succesful to add with code: ", succes))
    .catch((err) => console.error("Operation not succesful to add with code: ", err))

  }

  function addTask(new_task: Task) {

    setTasks((prevTasks) => [...prevTasks, new_task])
    setTodoDescription("");
  }

  const toggleTasksCall = async (id: number, completed: boolean) => {
    toggleTasks(id);
    
    const completedfinal = !completed
    console.log(completedfinal)
    await invoke("toggle_task_call", { id, completedfinal })
    .then((succes) => console.log("Operation succesful to toggle with code: ", succes))
    .catch((error) => console.error("Operation failed with code: ", error))
  }

  function toggleTasks(id: number) {
    setTasks((prevTasks) => prevTasks.map((todo) =>
      todo.id == id
        ? { ...todo, completed: !todo.completed }
        : todo
      )
    );
  }

  const deleteTaskCall = async (id: number) => {
    if (tasks.length == 0) {return;}
    
    deleteTask(id)

    await invoke( "delete_task_call", { id } )
    .then((succes) => console.log("Succes on deleting with code: ", succes))
    .catch((err) => console.error(err))

  }

  function deleteTask(id: number) {
    setTasks((prevTasks) => prevTasks.filter((todo) =>
      todo.id != id
    ));
  }

  return (
    <div className="container">
      <div data-tauri-drag-region className="titlebar">
        <div id="titlebar-title">
          <p>Dostar</p>
          <form action="submit" onSubmit={(e) => {e.preventDefault(); addTaskCall()}}>
            <input placeholder="Add a new task!" spellCheck={false} value={todoDescription} id="todoinput" type="text" onChange={(e) => setTodoDescription(e.target.value)}/>
          </form>

          <button id="allbut" onClick={() => updateFilter("all")} className="filter-button"> All </button>
          <button id="donebut" onClick={() => updateFilter("done")} className="filter-button"> Done </button>
          <button id="undonebut" onClick={() => updateFilter("undone")} className="filter-button"> Undone </button>

        </div>
        <div id="titlebar-buttons">
          <div className="titlebar-button" id="titlebar-minimize" onClick={() => appWindow.minimize()}>
            -
          </div>
          <div className="titlebar-button" id="titlebar-close">
            <img id="closebutton" src={defaultOff} alt="close" onClick={()  => appWindow.close()}/>
          </div>
        </div>
      </div>

      <div id="emptydiv" className="swapdiv" style={{
        backgroundImage:  `url(${spaceBackground})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover"
      }}>
        <p>No Tasks To Do!</p>
      </div>

      <div id="table" className="swapdiv">
        <table>
          <tr>
            <th id="row-description">DESCRIPTION</th>
            <th id="row-date">DATE</th>
            <th id="row-complete">COMPLETED</th>
            <th id="row-delete">DELETE</th>
          </tr>

          <tbody>
          {filteredTasks.map((task) => 
            <tr key={task.id}>
              <td>{task.description}</td>
              <td>{task.date}</td>
              <td>
                <div id="checkboxcontainer">
                  <CheckMark ischecked={task.completed} onChange={() => toggleTasksCall(task.id, task.completed) } />
                </div>
                </td>
              <td>
                <img src={skullIcon} id="tododeletebutton" onClick={() => deleteTaskCall(task.id)} />
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

interface CheckMarkProps {
  onChange: () => void;
  ischecked: boolean;
}

const CheckMark: React.FC<CheckMarkProps> = ({ onChange, ischecked }) => {
  return (
    <input type="checkbox" onChange={onChange} checked={ischecked}/>
  );
};

export default App;
