var app = require('../app');

app.controller('NewsController', NewsController);
app.filter('unsafe', function($sce) { 
	return $sce.trustAsHtml; 
});

NewsController.$inject = [
	'NewsService',
	'$mdDialog',
	'$location',
	'$route',
	'$rootScope',
	'$filter',
	'socket'
];

function NewsController(NewsService, $mdDialog, $location, $route, $rootScope, $filter, socket) {
	var vm = this;
	vm.text = 'News';
	vm.formView = true;
	vm.user ='55ddbde6d636c0e46a23fc90';
	vm.author = 'Veronika Balko';

	vm.tinymceOptions = {
		inline: false,
		plugins: [
				"advlist autolink lists link image charmap print preview anchor",
				"searchreplace visualblocks code fullscreen",
				'print textcolor',
				"insertdatetime media table contextmenu paste"
		],
		toolbar: "insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | forecolor | backcolor",
		skin: 'lightgray',
		theme : 'modern'
	};

	vm.tinymceOptionsComment = {
		menubar: false, 
		statusbar: false
	};

/*	var lastRoute = $route.current;
	$rootScope.$on('$locationChangeSuccess', function (event) {
		console.log(lastRoute);
			if (lastRoute.$route.originalPath === $route.current.$route.originalPath) {
					$route.current = lastRoute;
			}
	});*/

	$rootScope.$watch('selectedIndex', function(current, old) {
		switch(current) {
			case 0: $location.url("/company"); break;
			case 1: $location.url("/sandbox"); break;
			case 2: $location.url("/weekly"); break;
			
		}
	});
/*		var lastRoute = $route.current;
		$rootScope.$on('$locationChangeSuccess', function(event) {
				$route.current = lastRoute;
		});*/
/*$rootScope.$route = $route;*/
/*		vm.isActive = function(route) {
			console.log(route);
				return route === $location.path();
		};
*/

	vm.posts = [];
	getNews();
	function getNews(){
		NewsService.getNews().then(function(data){
			vm.posts = data.slice(0,20);
			console.log(vm.posts);
			vm.sandboxPosts = $filter('filter')(vm.posts, {type: 'sandbox'});
			vm.companyPosts = $filter('filter')(vm.posts, {type: 'company'});
			vm.weeklyPosts = $filter('filter')(vm.posts, {type: 'weekly'});
		});
	}


	vm.filtertNews = function(type){
		console.log(type);
	};

	vm.editpost = function(newsId, newpost) {
		NewsService.editNews(newsId, newpost).then(function() {
			socket.emit("edit post", {postId: newsId, body: newpost});
		});
	};

	vm.createNews = function(type) {
		vm.news = {};
		if(vm.titleNews && vm.bodyNews){
			vm.news = {
				title: vm.titleNews,
				body: vm.bodyNews,
				date: Date.parse(new Date()),
				comments: [],
				likes: [],
				type: type
			};
		vm.titleNews = '';
		vm.bodyNews = '';
		vm.formView = true;
		}

		NewsService.createNews(vm.news).then(function(post) {
			socket.emit("new post", post);
		});
	};

/*	vm.toggleText = [];
	vm.textLength = [];

	vm.loadMore = function(index) {
		vm.toggleText[index] = !vm.toggleText[index];
		if(vm.toggleText[index]){
			vm.textLength[index] = vm.posts[index].body.length;
		}else{
			vm.textLength[index] = 200;
		}
	};*/
	vm.toggleForm = function() {
		vm.formView = !vm.formView;
	};

	vm.commentForm = [];
	vm.toggleCommentForm = function(index) {
		vm.commentForm[index] = !vm.commentForm[index];
	};

	vm.commentsViev = [];
	vm.toggleComments = function(index) {
		vm.commentsViev[index] =!vm.commentsViev[index];
	};

	vm.newComment = function(commentText, newsId, index) {
		var comment = {
			author: vm.user,
			body: commentText,
			date: Date.parse(new Date()),
			likes: []
			};
		NewsService.addComment(newsId, comment).then(function(){
			comment.postId = newsId;
			socket.emit("new comment", comment);
		});
		vm.commentForm[index] = false;
	};

	vm.deleteNews = function(newsId) {
		NewsService.deleteNews(newsId).then(function() {
			socket.emit("delete post", newsId);
		});
	};

	vm.deleteComment = function(newsId, commentId) {
		NewsService.deleteComment(newsId, commentId).then(function() {
			socket.emit("delete comment", {post: newsId, comment: commentId});
		});
	};

	vm.newsLike = function(newsId, userId, index) {
		if(vm.posts[index].likes.indexOf(userId) < 0) {
			NewsService.newsLike(newsId, userId).then(function() {
				socket.emit("like post", {post: newsId, user: userId, isLike: true});
			});
		} else {
			NewsService.deleteNewsLike(newsId, userId).then(function() {
				socket.emit("like post", {post: newsId, user: userId, isLike: false});
			});
		}
	};

	vm.commentLike = function(newsId, commentId, userId) {
		
		var post = $filter('filter')(vm.posts, {_id: newsId});

		console.log(post);
		NewsService.comentLike(newsId, commentId, userId);
/*		var comLike = vm.posts[parentIndex].comments[index].likes;
		if(comLike.indexOf(vm.user) < 0){
			comLike.push(vm.user);
		}else{
			comLike.splice(comLike.indexOf(vm.user), 1);
		}*/
	};




	// Socket logic
	socket.on("push post", function(post) {
		if(post) vm.posts.unshift(post);
	});

	socket.on("change post", function(newPost) {
		if(newPost) {
			var post = $filter('filter')(vm.posts, {_id: newPost.postId});
			if(post[0]) {
				post[0].body = newPost.body;
			}
		}
	});

	socket.on("splice post", function(postId) {
		var index = vm.posts.map(function(x) {return x._id; }).indexOf(postId);
		vm.posts.splice(index, 1);
	});

	socket.on("change like post", function(newPost) {
		if(newPost) {
			var post = $filter('filter')(vm.posts, {_id: newPost.post});
			if(post[0]) {
				if(newPost.isLike) post[0].likes.push(newPost.user);
				else {
					var index = post[0].likes.indexOf(newPost.user);
					if(index != -1) post[0].likes.splice(index, 1);
				}
			}
		}
	});
	
	socket.on("push comment", function(comment) {
		var post = $filter('filter')(vm.posts, {_id: comment.postId});
		if(post[0]) {
			delete post[0].postId;
			post[0].comments.push(comment);
		}
	});

	socket.on("splice comment", function(commentDetails) {
		var post = $filter('filter')(vm.posts, {_id: commentDetails.post});
		if(post[0]) {
			var index = post[0].comments.map(function(x) {return x._id; }).indexOf(commentDetails.comment);
			post[0].comments.splice(index, 1);
		}
	});

	// Modal post
	vm.showModalPost = showModalPost;
	vm.currentPost = {};

	function checkUrlPath() {
		var path = $location.path();

		if(path.indexOf("post") > -1) {
			path = path.split("/").join("");
			var postId = path.substring(4, path.length);
			var post = $filter('filter')(vm.posts, {_id: postId});

			if(post[0]) showModalPost(post[0], false);
		}
	}

	function showModalPost(post, isSetPath) {
		vm.currentPost = post;

		if(isSetPath) {
			// Set url path in browser
			correctPath();
			$location.path("/post/" + post._id);
		}

		$mdDialog.show({
			controller: DialogController,
			templateUrl: './templates/news/ModalPost.html',
			parent: angular.element(document.body),
			clickOutsideToClose: true
		}).then(function(answer) {
			vm.status = 'You said the information was "' + answer + '".';
		}, function() {
			// Reset path in browser
			correctPath();
			$location.path("/");
		});
	}

	function correctPath() {
		var original = $location.path;
		$location.path = function(path) {
			var lastRoute = $route.current;
			var un = $rootScope.$on('$locationChangeSuccess', function () {
				$route.current = lastRoute;
				un();
			});
			return original.apply($location, [path]);
		};
	}

	function DialogController($scope, $mdDialog) {
		$scope.post = vm.currentPost;
		$scope.hide = function() {
			$mdDialog.hide();
		};
		$scope.cancel = function() {
			console.log(true);
		};
		$scope.answer = function(answer) {
			$mdDialog.hide(answer);
		};
	}
}