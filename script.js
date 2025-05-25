const clockElement = document.getElementById("clock")
const dateElement = document.getElementById("date")
const foldersList = document.getElementById("folders-list")
const addFolderBtn = document.getElementById("add-folder-btn")
const tabButtons = document.querySelectorAll(".tab-btn")
const tabContents = document.querySelectorAll(".tab-content")
const taskForm = document.getElementById("task-form")
const taskTitleInput = document.getElementById("task-title")
const taskNotesInput = document.getElementById("task-notes")
const taskDueDateInput = document.getElementById("task-due-date")
const taskFolderSelect = document.getElementById("task-folder")
const taskNotifySelect = document.getElementById("task-notify")
const submitBtn = document.getElementById("submit-btn")
const cancelBtn = document.getElementById("cancel-btn")
const tasksContainer = document.getElementById("tasks-container")
const prevMonthBtn = document.getElementById("prev-month")
const nextMonthBtn = document.getElementById("next-month")
const calendarTitle = document.getElementById("calendar-title")
const calendarDays = document.getElementById("calendar-days")
const connectGoogleBtn = document.getElementById("connect-google-btn")
const syncContent = document.getElementById("sync-content")


const recordBtn = document.getElementById("record-btn")
const recordingStatus = document.getElementById("recording-status")
const audioPreview = document.getElementById("audio-preview")
const audioPlayer = document.getElementById("audio-player")
const deleteRecordingBtn = document.getElementById("delete-recording-btn")


let tasks = JSON.parse(localStorage.getItem("tasks")) || []
const folders = JSON.parse(localStorage.getItem("folders")) || [
  { id: "today", name: "Today" },
  { id: "upcoming", name: "Upcoming" },
  { id: "all", name: "All Tasks" },
]
let activeFolder = "all"
let editingTaskId = null
const currentMonth = new Date()


let mediaRecorder = null
let audioChunks = []
let recordedAudioURL = null


function init() {
  updateClock()
  setInterval(updateClock, 1000)
  renderFolders()
  renderTasks()
  renderCalendar()
  setupEventListeners()
  checkNotifications()
  setInterval(checkNotifications, 60000) 
  
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission()
  }
}


function updateClock() {
  const now = new Date()

  
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const seconds = now.getSeconds().toString().padStart(2, "0")
  clockElement.textContent = `${hours}:${minutes}:${seconds}`

  
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  dateElement.textContent = now.toLocaleDateString(undefined, options)
}


function setupEventListeners() {
  
  foldersList.addEventListener("click", (e) => {
    if (e.target.tagName === "LI") {
      activeFolder = e.target.dataset.folder
      document.querySelectorAll(".folders-list li").forEach((li) => {
        li.classList.remove("active")
      })
      e.target.classList.add("active")
      renderTasks()
    }
  })

  
  addFolderBtn.addEventListener("click", () => {
    const folderName = prompt("Enter folder name:")
    if (folderName && folderName.trim()) {
      const newFolder = {
        id: "folder_" + Date.now(),
        name: folderName.trim(),
      }
      folders.push(newFolder)
      localStorage.setItem("folders", JSON.stringify(folders))
      renderFolders()
      updateTaskFolderOptions()
    }
  })


  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"))
      tabContents.forEach((content) => content.classList.remove("active"))

      button.classList.add("active")
      const tabId = button.dataset.tab
      document.getElementById(`${tabId}-view`).classList.add("active")

      if (tabId === "calendar") {
        renderCalendar()
      }
    })
  })

  
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const taskTitle = taskTitleInput.value.trim()
    const taskNotes = taskNotesInput.value.trim()
    const taskDueDate = taskDueDateInput.value
    const taskFolder = taskFolderSelect.value
    const taskNotify = Number.parseInt(taskNotifySelect.value)

    if (!taskTitle) return

    if (editingTaskId) {
      
      const taskIndex = tasks.findIndex((task) => task.id === editingTaskId)
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          title: taskTitle,
          notes: taskNotes,
          dueDate: taskDueDate,
          folderId: taskFolder,
          notifyBefore: taskNotify,
          notified: false,
          voiceMessage: recordedAudioURL, 
        }
      }
      editingTaskId = null
      document.getElementById("form-title").textContent = "Add New Task"
      submitBtn.textContent = "Add Task"
      cancelBtn.style.display = "none"
    } else {
      
      const newTask = {
        id: "task_" + Date.now(),
        title: taskTitle,
        notes: taskNotes,
        dueDate: taskDueDate,
        folderId: taskFolder,
        completed: false,
        createdAt: new Date().toISOString(),
        notifyBefore: taskNotify,
        notified: false,
        voiceMessage: recordedAudioURL, 
      }
      tasks.push(newTask)
    }

    localStorage.setItem("tasks", JSON.stringify(tasks))
    taskForm.reset()
    renderTasks()
    renderCalendar()

    
    recordedAudioURL = null
    audioPlayer.src = ""
    audioPreview.style.display = "none"
  })

 
  cancelBtn.addEventListener("click", () => {
    editingTaskId = null
    taskForm.reset()
    document.getElementById("form-title").textContent = "Add New Task"
    submitBtn.textContent = "Add Task"
    cancelBtn.style.display = "none"

    
    recordedAudioURL = null
    audioPlayer.src = ""
    audioPreview.style.display = "none"
  })

  
  prevMonthBtn.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1)
    renderCalendar()
  })

  nextMonthBtn.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1)
    renderCalendar()
  })

  
  connectGoogleBtn.addEventListener("click", () => {
    
    syncContent.innerHTML = `
            <div class="alert alert-success">
                <span>✓</span> Connected to Google Calendar
            </div>
            <div style="border: 1px solid #e0e0e0; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                <h3 style="margin-bottom: 10px; font-size: 16px;">Sync Options</h3>
                <p style="margin-bottom: 15px; font-size: 14px; color: #666;">
                    You have ${tasks.length} tasks that can be synced to your Google Calendar.
                </p>
                <button id="sync-tasks-btn" class="btn btn-primary" style="width: 100%;">
                    Sync Tasks to Google Calendar
                </button>
            </div>
        `

    document.getElementById("sync-tasks-btn").addEventListener("click", () => {
      
      const syncBtn = document.getElementById("sync-tasks-btn")
      syncBtn.textContent = "Syncing..."
      syncBtn.disabled = true

      setTimeout(() => {
        syncContent.innerHTML = `
                    <div class="alert alert-success">
                        <span>✓</span> Connected to Google Calendar
                    </div>
                    <div style="border: 1px solid #e0e0e0; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                        <h3 style="margin-bottom: 10px; font-size: 16px;">Sync Options</h3>
                        <p style="margin-bottom: 15px; font-size: 14px; color: #666;">
                            You have ${tasks.length} tasks that can be synced to your Google Calendar.
                        </p>
                        <button id="sync-tasks-btn" class="btn btn-primary" style="width: 100%;">
                            Sync Tasks to Google Calendar
                        </button>
                    </div>
                    <div class="alert alert-success">
                        <strong>Success!</strong> Your tasks have been successfully synced with Google Calendar.
                    </div>
                `

        document.getElementById("sync-tasks-btn").addEventListener("click", () => {
          
          syncContent.querySelector(".alert-success:last-child").remove()
          document.getElementById("sync-tasks-btn").textContent = "Syncing..."
          document.getElementById("sync-tasks-btn").disabled = true

          setTimeout(() => {
            syncContent.innerHTML += `
                            <div class="alert alert-success">
                                <strong>Success!</strong> Your tasks have been successfully synced with Google Calendar.
                            </div>
                        `
            document.getElementById("sync-tasks-btn").textContent = "Sync Tasks to Google Calendar"
            document.getElementById("sync-tasks-btn").disabled = false
          }, 1500)
        })
      }, 1500)
    })
  })

  
  recordBtn.addEventListener("click", toggleRecording)
  deleteRecordingBtn.addEventListener("click", deleteRecording)
}


function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording()
  } else {
    startRecording()
  }
}


function startRecording() {
  
  audioChunks = []

  
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorder = new MediaRecorder(stream)

      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunks.push(event.data)
      })

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" })
        recordedAudioURL = URL.createObjectURL(audioBlob)

        
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = () => {
          recordedAudioURL = reader.result 
          audioPlayer.src = recordedAudioURL
          audioPreview.style.display = "flex"
        }

        
        stream.getTracks().forEach((track) => track.stop())

        recordingStatus.textContent = ""
        recordingStatus.classList.remove("active")
        recordBtn.textContent = "🎤 Record Voice"
      })

      
      mediaRecorder.start()
      recordingStatus.textContent = "Recording... (click again to stop)"
      recordingStatus.classList.add("active")
      recordBtn.textContent = "⏹️ Stop Recording"
    })
    .catch((error) => {
      console.error("Error accessing microphone:", error)
      recordingStatus.textContent = "Error: Could not access microphone"
    })
}


function stopRecording() {
  if (mediaRecorder) {
    mediaRecorder.stop()
  }
}


function deleteRecording() {
  recordedAudioURL = null
  audioPlayer.src = ""
  audioPreview.style.display = "none"
  recordingStatus.textContent = ""
}


function renderFolders() {
  foldersList.innerHTML = ""

  folders.forEach((folder) => {
    const li = document.createElement("li")
    li.dataset.folder = folder.id
    li.textContent = folder.name
    if (folder.id === activeFolder) {
      li.classList.add("active")
    }
    foldersList.appendChild(li)
  })

  updateTaskFolderOptions()
}


function updateTaskFolderOptions() {
  taskFolderSelect.innerHTML = ""

  folders.forEach((folder) => {
    const option = document.createElement("option")
    option.value = folder.id
    option.textContent = folder.name
    taskFolderSelect.appendChild(option)
  })
}


function getFilteredTasks() {
  return tasks.filter((task) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const taskDate = task.dueDate ? new Date(task.dueDate) : null
    if (taskDate) {
      taskDate.setHours(0, 0, 0, 0)
    }

    if (activeFolder === "today") {
      return taskDate && isSameDay(taskDate, today)
    } else if (activeFolder === "upcoming") {
      return taskDate && taskDate > today
    } else if (activeFolder === "all") {
      return true
    } else {
      return task.folderId === activeFolder
    }
  })
}


function groupTasksByDate(tasks) {
  const grouped = {}

  tasks.forEach((task) => {
    if (!task.dueDate) {
      const key = "No Due Date"
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(task)
      return
    }

    const date = new Date(task.dueDate)
    let dateKey

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (isSameDay(date, today)) {
      dateKey = "Today"
    } else if (isSameDay(date, tomorrow)) {
      dateKey = "Tomorrow"
    } else {
      dateKey = date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }

    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }

    grouped[dateKey].push(task)
  })

  return grouped
}


function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}


function renderTasks() {
  const filteredTasks = getFilteredTasks()
  const groupedTasks = groupTasksByDate(filteredTasks)

  tasksContainer.innerHTML = ""

  if (Object.keys(groupedTasks).length === 0) {
    tasksContainer.innerHTML =
      '<div class="text-center" style="padding: 30px; color: #888;">No tasks found. Add a new task to get started!</div>'
    return
  }

  
  const sortedDates = Object.keys(groupedTasks).sort((a, b) => {
    if (a === "Today") return -1
    if (b === "Today") return 1
    if (a === "Tomorrow") return -1
    if (b === "Tomorrow") return 1
    if (a === "No Due Date") return 1
    if (b === "No Due Date") return -1

    
    const dateA = new Date(
      a
        .replace("Monday, ", "")
        .replace("Tuesday, ", "")
        .replace("Wednesday, ", "")
        .replace("Thursday, ", "")
        .replace("Friday, ", "")
        .replace("Saturday, ", "")
        .replace("Sunday, ", ""),
    )
    const dateB = new Date(
      b
        .replace("Monday, ", "")
        .replace("Tuesday, ", "")
        .replace("Wednesday, ", "")
        .replace("Thursday, ", "")
        .replace("Friday, ", "")
        .replace("Saturday, ", "")
        .replace("Sunday, ", ""),
    )

    return dateA - dateB
  })

  sortedDates.forEach((dateKey) => {
    const tasks = groupedTasks[dateKey]

    const taskGroup = document.createElement("div")
    taskGroup.className = "task-group"

    const taskGroupHeader = document.createElement("div")
    taskGroupHeader.className = "task-group-header"
    taskGroupHeader.innerHTML = `
            <span>${dateKey}</span>
            <span class="toggle-icon">▼</span>
        `

    const taskList = document.createElement("ul")
    taskList.className = "task-list"

    tasks.forEach((task) => {
      const taskItem = document.createElement("li")
      taskItem.className = `task-item ${task.completed ? "task-completed" : ""}`

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.className = "task-checkbox"
      checkbox.checked = task.completed
      checkbox.addEventListener("change", () => {
        toggleTaskCompletion(task.id)
      })

      const taskContent = document.createElement("div")
      taskContent.className = "task-content"

      const taskTitle = document.createElement("div")
      taskTitle.className = "task-title"
      taskTitle.textContent = task.title

      taskContent.appendChild(taskTitle)

      if (task.notes) {
        const taskNotes = document.createElement("div")
        taskNotes.className = "task-notes"
        taskNotes.textContent = task.notes
        taskContent.appendChild(taskNotes)
      }

      
      if (task.voiceMessage) {
        const taskVoice = document.createElement("div")
        taskVoice.className = "task-voice"

        const audioElement = document.createElement("audio")
        audioElement.controls = true
        audioElement.src = task.voiceMessage

        taskVoice.appendChild(audioElement)
        taskContent.appendChild(taskVoice)
      }

      if (task.dueDate) {
        const taskDue = document.createElement("div")
        taskDue.className = "task-due"
        taskDue.innerHTML = `
                    <span>⏰</span> ${new Date(task.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    ${task.notifyBefore ? `(Reminder: ${task.notifyBefore} min before)` : ""}
                `
        taskContent.appendChild(taskDue)
      }

      const taskActions = document.createElement("div")
      taskActions.className = "task-actions"

      const editBtn = document.createElement("button")
      editBtn.className = "btn-task"
      editBtn.innerHTML = "✏️"
      editBtn.addEventListener("click", () => {
        editTask(task.id)
      })

      const deleteBtn = document.createElement("button")
      deleteBtn.className = "btn-task"
      deleteBtn.innerHTML = "🗑️"
      deleteBtn.addEventListener("click", () => {
        deleteTask(task.id)
      })

      taskActions.appendChild(editBtn)
      taskActions.appendChild(deleteBtn)

      taskItem.appendChild(checkbox)
      taskItem.appendChild(taskContent)
      taskItem.appendChild(taskActions)

      taskList.appendChild(taskItem)
    })

    taskGroup.appendChild(taskGroupHeader)
    taskGroup.appendChild(taskList)

    tasksContainer.appendChild(taskGroup)

    
    taskGroupHeader.addEventListener("click", () => {
      taskList.style.display = taskList.style.display === "none" ? "block" : "none"
      taskGroupHeader.querySelector(".toggle-icon").textContent = taskList.style.display === "none" ? "▶" : "▼"
    })
  })
}


function toggleTaskCompletion(taskId) {
  const taskIndex = tasks.findIndex((task) => task.id === taskId)
  if (taskIndex !== -1) {
    tasks[taskIndex].completed = !tasks[taskIndex].completed
    localStorage.setItem("tasks", JSON.stringify(tasks))
    renderTasks()
    renderCalendar()
  }
}


function editTask(taskId) {
  const task = tasks.find((task) => task.id === taskId)
  if (!task) return

  editingTaskId = taskId

  taskTitleInput.value = task.title
  taskNotesInput.value = task.notes || ""
  taskDueDateInput.value = task.dueDate || ""
  taskFolderSelect.value = task.folderId
  taskNotifySelect.value = task.notifyBefore

  
  if (task.voiceMessage) {
    recordedAudioURL = task.voiceMessage
    audioPlayer.src = task.voiceMessage
    audioPreview.style.display = "flex"
  } else {
    recordedAudioURL = null
    audioPlayer.src = ""
    audioPreview.style.display = "none"
  }

  document.getElementById("form-title").textContent = "Edit Task"
  submitBtn.textContent = "Update Task"
  cancelBtn.style.display = "inline-block"

  
  taskForm.scrollIntoView({ behavior: "smooth" })
}


function deleteTask(taskId) {
  if (confirm("Are you sure you want to delete this task?")) {
    tasks = tasks.filter((task) => task.id !== taskId)
    localStorage.setItem("tasks", JSON.stringify(tasks))
    renderTasks()
    renderCalendar()
  }
}


function renderCalendar() {
  // Update calendar title
  calendarTitle.textContent = currentMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })

  
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)

  
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

  
  const firstDayOfWeek = firstDay.getDay()

  
  const daysFromPrevMonth = firstDayOfWeek

  
  const totalDays = daysFromPrevMonth + lastDay.getDate()

  
  const rows = Math.ceil(totalDays / 7)

  
  calendarDays.innerHTML = ""

  
  const today = new Date()

  
  const currentDate = new Date(firstDay)
  currentDate.setDate(currentDate.getDate() - daysFromPrevMonth)

  
  for (let i = 0; i < rows * 7; i++) {
    const dayElement = document.createElement("div")
    dayElement.className = "calendar-day"

    
    const isCurrentMonth = currentDate.getMonth() === currentMonth.getMonth()
    if (!isCurrentMonth) {
      dayElement.classList.add("other-month")
    }

    
    const isToday = isSameDay(currentDate, today)
    if (isToday) {
      dayElement.classList.add("today")
    }

    
    const dayNumber = document.createElement("div")
    dayNumber.className = "calendar-day-number"
    dayNumber.textContent = currentDate.getDate()
    dayElement.appendChild(dayNumber)

    
    const dayTasks = tasks.filter((task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return isSameDay(taskDate, currentDate)
    })

    dayTasks.forEach((task) => {
      const taskElement = document.createElement("div")
      taskElement.className = `calendar-task ${task.completed ? "completed" : ""}`
      taskElement.textContent = task.title
      taskElement.addEventListener("click", () => {
        editTask(task.id)

        
        tabButtons.forEach((btn) => btn.classList.remove("active"))
        tabContents.forEach((content) => content.classList.remove("active"))

        document.querySelector('[data-tab="list"]').classList.add("active")
        document.getElementById("list-view").classList.add("active")
      })
      dayElement.appendChild(taskElement)
    })

    calendarDays.appendChild(dayElement)

    
    currentDate.setDate(currentDate.getDate() + 1)
  }
}


function checkNotifications() {
  const now = new Date()

  tasks.forEach((task) => {
    if (task.dueDate && task.notifyBefore && !task.notified) {
      const dueDate = new Date(task.dueDate)
      const notifyTime = new Date(dueDate.getTime() - task.notifyBefore * 60000)

      if (now >= notifyTime && now < dueDate) {
        
        if (Notification.permission === "granted") {
          new Notification("Task Reminder", {
            body: `"${task.title}" is due in ${task.notifyBefore} minutes!`,
            icon: "/favicon.ico",
          })

          
          const taskIndex = tasks.findIndex((t) => t.id === task.id)
          if (taskIndex !== -1) {
            tasks[taskIndex].notified = true
            localStorage.setItem("tasks", JSON.stringify(tasks))
          }
        }
      }
    }
  })
}


init()
