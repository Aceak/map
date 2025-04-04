// Initialize the map and load existing comments
const map = new AMap.Map('map', {
  center: [117.145, 34.217], // Center coordinates (CUMT Library vicinity)
  zoom: 17,
  viewMode: '3D',
  pitch: 45, // 3D view pitch (0-83)
  doubleClickZoom: false // Disable default double-click zoom (we use double-click for adding marker)
});

// Add map controls for zoom and scale
map.addControl(new AMap.Scale());
map.addControl(new AMap.ToolBar());

// Caching DOM elements for better performance
const elements = {
  addModal: document.getElementById('addCommentModal'),
  detailOverlay: document.getElementById('detailOverlay'),
  commentForm: document.getElementById('commentForm'),
  replyForm: document.getElementById('replyForm'),
  commentLatInput: document.getElementById('commentLat'),
  commentLngInput: document.getElementById('commentLng'),
  replyCommentIdInput: document.getElementById('replyCommentId'),
  commentDetailDiv: document.getElementById('commentDetail'),
  repliesListDiv: document.getElementById('repliesList'),
  closeButtons: document.querySelectorAll('.close-btn')
};

// Utility: create a DOM element for a reply item
function createReplyElement(reply) {
  const replyDiv = document.createElement('div');
  replyDiv.className = 'reply-item';

  const metaP = document.createElement('p');
  const nameStrong = document.createElement('strong');
  nameStrong.textContent = reply.name + ' ';
  metaP.appendChild(nameStrong);
  if (reply.created_at) {
    const timeSmall = document.createElement('small');
    timeSmall.textContent = `(${reply.created_at})`;
    metaP.appendChild(timeSmall);
  }
  replyDiv.appendChild(metaP);

  const textP = document.createElement('p');
  textP.textContent = reply.text;
  replyDiv.appendChild(textP);

  if (reply.img_url) {
    const imgEl = document.createElement('img');
    imgEl.src = reply.img_url;
    imgEl.className = 'reply-image';
    replyDiv.appendChild(imgEl);
  }

  return replyDiv;
}

// Open the add-comment modal for a given map coordinate
function openCommentForm(lat, lng) {
  elements.commentForm.reset();
  elements.commentLatInput.value = lat;
  elements.commentLngInput.value = lng;
  elements.addModal.style.display = 'flex';
}

// Close all overlays (add comment or detail)
function closeOverlays() {
  elements.addModal.style.display = 'none';
  elements.detailOverlay.style.display = 'none';
}

// Populate and show the detail overlay for a specific comment (with replies)
function showCommentDetail(data) {
  elements.commentDetailDiv.innerHTML = '';
  elements.repliesListDiv.innerHTML = '';

  const comment = data.comment;
  const detailMeta = document.createElement('p');
  const nameStrong = document.createElement('strong');
  nameStrong.textContent = comment.name + ' ';
  detailMeta.appendChild(nameStrong);

  if (comment.created_at) {
    const timeSmall = document.createElement('small');
    timeSmall.textContent = `(${comment.created_at})`;
    detailMeta.appendChild(timeSmall);
  }
  elements.commentDetailDiv.appendChild(detailMeta);

  const textP = document.createElement('p');
  textP.textContent = comment.text;
  elements.commentDetailDiv.appendChild(textP);

  if (comment.img_url) {
    const imgEl = document.createElement('img');
    imgEl.src = comment.img_url;
    imgEl.className = 'comment-image';
    elements.commentDetailDiv.appendChild(imgEl);
  }

  data.replies.forEach(reply => {
    elements.repliesListDiv.appendChild(createReplyElement(reply));
  });

  elements.replyForm.reset();
  elements.replyCommentIdInput.value = comment.id;
  elements.detailOverlay.style.display = 'flex';
}

// Fetch and display all comments (markers on map)
function loadComments() {
  fetch('/api/comments')
    .then(response => response.json())
    .then(data => {
      if (!data.success) {
        console.error('Failed to load comments:', data.error);
        return;
      }

      data.comments.forEach(comment => {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'marker-bubble';
        contentDiv.innerText = comment.text;

        const marker = new AMap.Marker({
          position: [comment.lng, comment.lat],
          content: contentDiv,
          offset: new AMap.Pixel(0, 0), // Adjust after adding
          extData: { id: comment.id }
        });

        map.add(marker);

        const w = contentDiv.offsetWidth;
        const h = contentDiv.offsetHeight;
        marker.setOffset(new AMap.Pixel(-w / 2, -h));

        marker.on('click', function(e) {
          const cid = e.target.getExtData().id;
          fetch(`/api/comments/${cid}`)
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                showCommentDetail(data);
              } else {
                alert(data.error || '加载留言详情失败');
              }
            })
            .catch(err => console.error('Error fetching comment detail:', err));
        });
      });
    })
    .catch(err => console.error('Error loading comments:', err));
}

// Event: double-click on map to add a new comment at that location
map.on('dblclick', function(event) {
  const lnglat = event.lnglat;
  openCommentForm(lnglat.getLat(), lnglat.getLng());
});

// Event: close buttons on modals (batch binding)
elements.closeButtons.forEach(btn => {
  btn.addEventListener('click', closeOverlays);
});

// Handle comment form submission (new comment)
elements.commentForm.addEventListener('submit', function(e) {
  e.preventDefault();
  if (!elements.commentForm.checkValidity()) {
    elements.commentForm.reportValidity();
    return;
  }

  const formData = new FormData(elements.commentForm);
  fetch('/api/comments', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const c = data.comment;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'marker-bubble';
        contentDiv.innerText = c.text;

        const marker = new AMap.Marker({
          position: [c.lng, c.lat],
          content: contentDiv,
          offset: new AMap.Pixel(0, 0),
          extData: { id: c.id }
        });

        map.add(marker);

        const w = contentDiv.offsetWidth;
        const h = contentDiv.offsetHeight;
        marker.setOffset(new AMap.Pixel(-w / 2, -h));

        marker.on('click', function(e) {
          const cid = e.target.getExtData().id;
          fetch(`/api/comments/${cid}`)
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                showCommentDetail(data);
              } else {
                alert(data.error || '加载留言详情失败');
              }
            })
            .catch(err => console.error('Error fetching comment detail:', err));
        });

        elements.addModal.style.display = 'none';
        elements.commentForm.reset();
      } else {
        alert(data.error || '提交留言失败');
      }
    })
    .catch(err => {
      console.error('Error submitting comment:', err);
      alert('提交留言失败');
    });
});

// Handle reply form submission (new reply)
elements.replyForm.addEventListener('submit', function(e) {
  e.preventDefault();
  if (!elements.replyForm.checkValidity()) {
    elements.replyForm.reportValidity();
    return;
  }

  const formData = new FormData(elements.replyForm);
  fetch('/api/replies', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const reply = data.reply;
        elements.repliesListDiv.appendChild(createReplyElement(reply));

        elements.replyForm.querySelector('input[name="name"]').value = '';
        elements.replyForm.querySelector('textarea[name="text"]').value = '';
        if (elements.replyForm.querySelector('input[name="image"]')) {
          elements.replyForm.querySelector('input[name="image"]').value = '';
        }
      } else {
        alert(data.error || '回复失败');
      }
    })
    .catch(err => {
      console.error('Error submitting reply:', err);
      alert('回复失败');
    });
});

// Initial load: fetch existing comments and display markers
loadComments();
